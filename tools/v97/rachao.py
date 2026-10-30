#!/usr/bin/env python3
"""RACHA v97 · O RACHÃO NA OFICINA — a página do Rachão (app/public/game/rachao/rachao.html).

O dono do jogo mandou o Rachão (um futebol de física num arquivo só, com o motor dele: 17 campos e 8 modos) em 29/10/2026
e pediu: "adicione esse rachão na oficina de criação com várias opções de edição". O original fica guardado como chegou em
backup/rachao.html (o sha256 é conferido aqui) e este script gera a página que o jogo abre, com só estas trocas:
  1. as fontes: o original pedia a Bungee e a Barlow Semi Condensed ao Google Fonts; agora são as do pacote (licença OFL,
     app/public/game/fontes): a Lilita One no lugar da Bungee e a Barlow Condensed no lugar da Semi Condensed — a página
     não pede nada para fora (nem as letras);
  2. a trava da página (Content-Security-Policy): só o que vem do próprio endereço, nenhuma conexão para fora;
  3. a Oficina de estádios: o estadios.css e o estadios.js (escritos aqui, ao lado da página) entram depois do jogo;
  4. quatro ganchos pequenos no motor, para o editor ter mais opções (com os campos de sempre, tudo continua igual):
     a cerca viva pode ficar inclinada (w.a, em graus); o vento lê as direções, a troca e a força do estádio
     (windDirs, windEvery, windForce); os poderes leem a lista e o intervalo do estádio (powers, powerEvery) e o Golzão
     não passa do tamanho que cabe no estádio (golzaoMax);
  5. depois do teste ("faltou pôr o modo sem cavadinha, sem curva, sem super chute" e "dá pra mesclar a física da bola
     do Rachão no RACHA, ao contrário também"): o estádio pode tirar a cavadinha, a curva e o super chute (chutes), e a
     física do RACHA entra pelo estádio — a velocidade máxima da bola (ballMax), o peso dela no contato e o quique no pé
     (ballWeight, ballFootBounce) e o andar da tampinha (andar 'direto': moveMax, moveAccel, moveBrake), com os bots
     sabendo andar assim. A ponte da física (ponte.js, ao lado) entra antes da oficina de estádios.
  6. v98 — as salas online do Rachão ("porém dá pra criar sala de rachão também on-line"): o quadro.js (a língua do
     online, a mesma do servidor) entra antes da oficina de estádios e o rede.js (a tela SALA ONLINE e a partida online)
     depois dela; no desenho, o nome de quem joga embaixo da tampinha dos outros (só no online: nos modos de sempre
     nenhum jogador tem nome de rede e nada muda). O servidor roda o motor desta página: tools/v98/rachao_servidor.py.
Uso: python3 tools/v97/rachao.py (o build, tools/aplicar_rua.py, roda este script na etapa v97)."""
import hashlib, pathlib

AQUI = pathlib.Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent
ORIGINAL = RAIZ / 'backup' / 'rachao.html'
PASTA = RAIZ / 'app' / 'public' / 'game' / 'rachao'
SAIDA = PASTA / 'rachao.html'
SHA_ORIGINAL = '2e9ec298cc4b60820f808393aa66b0672727774ce48c12a1f17c57c26027daf9'

src = ORIGINAL.read_bytes()
assert hashlib.sha256(src).hexdigest() == SHA_ORIGINAL, 'o backup/rachao.html mudou (é o arquivo como chegou: não edite, troque o sha conscientemente)'
t = src.decode('utf-8')


def troca(a, b, n=1):
    global t
    assert t.count(a) == n, ('rachão: o trecho mudou', a[:90], t.count(a), n)
    t = t.replace(a, b)


# ---------------------------------------------------------------- 1) as fontes do pacote (nada do Google Fonts)
FONTES = [('Lilita One', 'LilitaOne-Regular', 400), ('Barlow Condensed', 'BarlowCondensed-SemiBold', 600),
          ('Barlow Condensed', 'BarlowCondensed-Bold', 700), ('Barlow Condensed', 'BarlowCondensed-ExtraBold', 800)]
pasta_fontes = RAIZ / 'app' / 'public' / 'game' / 'fontes'
faces = []
for fam, arq, peso in FONTES:                            # (o .woff2 se existir; se não, o .ttf original, como o build do jogo)
    for ext, fmt in (('.woff2', 'woff2'), ('.ttf', 'truetype')):
        if (pasta_fontes / (arq + ext)).is_file():
            faces.append("@font-face{font-family:'%s';src:url('../fontes/%s%s') format('%s');font-weight:%d;font-display:swap;}" % (fam, arq, ext, fmt, peso))
            break
    else:
        raise SystemExit('rachão: falta a fonte ' + arq + ' em app/public/game/fontes')
troca('<link rel="preconnect" href="https://fonts.googleapis.com">\n'
      '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
      '<link href="https://fonts.googleapis.com/css2?family=Bungee&family=Barlow+Semi+Condensed:wght@500;600;700;800&display=swap" rel="stylesheet">\n',
      '<meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\' \'unsafe-inline\'; style-src \'self\' \'unsafe-inline\'; '
      'img-src \'self\' data:; font-src \'self\'; connect-src \'none\'; object-src \'none\'; base-uri \'none\'; form-action \'none\'">\n'
      '<meta name="referrer" content="no-referrer">\n'
      '<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 32 32%27%3E%3Ccircle cx=%2716%27 cy=%2716%27 r=%2714%27 fill=%27%23f7c531%27 stroke=%27%231d1b16%27 stroke-width=%273%27/%3E%3Cpath d=%27M16 9l5 3.6-1.9 5.8h-6.2L11 12.6z%27 fill=%27%231d1b16%27/%3E%3C/svg%3E">\n'
      '<style>' + ''.join(faces) + '</style>\n')
troca("--disp: 'Bungee', 'Arial Black', Impact, system-ui, sans-serif;", "--disp: 'Lilita One', 'Arial Black', Impact, system-ui, sans-serif;")
troca("--ui: 'Barlow Semi Condensed', 'Arial Narrow', 'Roboto Condensed', system-ui, sans-serif;", "--ui: 'Barlow Condensed', 'Arial Narrow', 'Roboto Condensed', system-ui, sans-serif;")
troca('"Barlow Semi Condensed"', '"Barlow Condensed"', 5)           # (os textos desenhados no canvas)
assert 'googleapis' not in t and 'gstatic' not in t and 'Bungee' not in t and 'Semi Condensed' not in t

# ---------------------------------------------------------------- 3) a Oficina de estádios (o estilo e o código ao lado)
troca('</style>\n</head>', '</style>\n<link rel="stylesheet" href="./estadios.css">\n</head>')
troca('</script>\n</body>', '</script>\n<script src="./ponte.js"></script>\n<script src="./quadro.js"></script>\n<script src="./estadios.js"></script>\n<script src="./rede.js"></script>\n</body>')   # (a ponte da física: v97 depois do teste · o quadro e o online: v98)

# ---------------------------------------------------------------- 4) os ganchos do motor (sem mudar os campos de sempre)
# a cerca viva inclinada (a = 0: o mesmo segmento de antes, cos 0 = 1 e sen 0 = 0)
troca("""    const sg = mkSeg(w.x - w.len / 2, w.y, w.x + w.len / 2, w.y, { bounce: 0.6, mask: M_ALL, kind: 'hedge', th: w.th, style: w.style });""",
      """    const wa = (w.a || 0) * Math.PI / 180, wc = Math.cos(wa) * w.len / 2, ws = Math.sin(wa) * w.len / 2;   // (Oficina de estádios: a cerca pode ficar inclinada)
    const sg = mkSeg(w.x - wc, w.y - ws, w.x + wc, w.y + ws, { bounce: 0.6, mask: M_ALL, kind: 'hedge', th: w.th, style: w.style });""")
# o vento: as direções, a troca e a força do estádio (sem nada: as 9 direções, 420 ticks e 0,03 de sempre)
troca("""        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [0, 0], [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]];
        let pickd;
        do { pickd = pick(dirs); } while (pickd[0] === w.dx && pickd[1] === w.dy);
        w.dx = pickd[0]; w.dy = pickd[1];
        w.t = 420;""",
      """        const dirs = this.map.windDirs || [[1, 0], [-1, 0], [0, 1], [0, -1], [0, 0], [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]];   // (Oficina de estádios)
        let pickd;
        do { pickd = pick(dirs); } while (dirs.length > 1 && pickd[0] === w.dx && pickd[1] === w.dy);
        w.dx = pickd[0]; w.dy = pickd[1];
        w.t = this.map.windEvery || 420;""")
troca("""      w.t--;
      const k = 0.03;""", """      w.t--;
      const k = 0.03 * (this.map.windForce || 1);""")
# os poderes: a lista e o intervalo do estádio (sem nada: os 10 poderes, a cada POWER_EVERY)
troca("""    this.stats = { kicks: 0, touches: 0 };
    this.setup();""", """    this.stats = { kicks: 0, touches: 0 };
    // Oficina de estádios: o estádio pode escolher quais poderes aparecem e de quanto em quanto tempo (sem nada: os 10, a cada 10 s)
    this.powerList = Array.isArray(this.map.powers) && this.map.powers.length ? POWERS.filter(p => this.map.powers.indexOf(p.id) >= 0) : POWERS;
    if (!this.powerList.length) this.powerList = POWERS;
    this.powerEvery = this.map.powerEvery > 0 ? this.map.powerEvery : POWER_EVERY;
    this.setup();""")
troca("power: null, powerTimer: POWER_EVERY - randi(0, 120),", "power: null, powerTimer: this.powerEvery - randi(0, Math.min(120, this.powerEvery >> 1)),")
troca("do { id = pick(POWERS).id; } while (id === p.lastPower && Math.random() < 0.8);",
      "do { id = pick(this.powerList).id; } while (this.powerList.length > 1 && id === p.lastPower && Math.random() < 0.8);")
troca("    p.powerTimer = POWER_EVERY;\n", "    p.powerTimer = this.powerEvery;\n")
troca("st.powerFrac = p.power ? 1 : 1 - p.powerTimer / POWER_EVERY;", "st.powerFrac = p.power ? 1 : 1 - p.powerTimer / (this.m.powerEvery || POWER_EVERY);")
# o Golzão (o gol × 1,6) cabe no estádio criado (golzaoMax); os 17 campos não têm e ficam iguais
troca("this.goalHalf[t] = Math.round(this.map.goal * 1.6);", "this.goalHalf[t] = Math.round(Math.min(this.map.goal * 1.6, this.map.golzaoMax || Infinity));   // (Oficina de estádios: o Golzão cabe no estádio)")

# ---------------------------------------------------------------- 5) depois do teste: os chutes do estádio e a física do RACHA
# Os campos de sempre não têm nada disto (chutes, ballMax, ballFootBounce, ballWeight, andar): tudo continua igual neles.
# os chutes: o estádio pode tirar a cavadinha, a curva ou o super chute (o botão some e os bots também não usam)
troca("    this.allowSuper = cfg.superKick !== undefined ? !!cfg.superKick : true;\n",
      "    this.allowSuper = cfg.superKick !== undefined ? !!cfg.superKick : true;\n"
      "    const ch = this.map.chutes;   // (Oficina de estádios: o estádio sem cavadinha, sem curva ou sem super chute)\n"
      "    if (ch) { if (ch.lob === false) this.allowLob = false; if (ch.curve === false) this.allowCurve = false; if (ch.superKick === false) this.allowSuper = false; }\n")
# a bola do RACHA: o peso no contato (a bola pesa ballWeight jogadores) e o quique no pé (ballFootBounce), só entre bola e jogador
troca("    this.P = this.stadium.phys;\n",
      "    this.P = this.stadium.phys;\n"
      "    if (this.P.ballFootBounce != null || this.P.ballWeight > 0) this.world.bolaPe = { e: this.P.ballFootBounce, peso: this.P.ballWeight };   // (Oficina de estádios)\n")
troca("    const tot = a.im + b.im;\n    if (tot <= 0) return;\n",
      "    let ia = a.im, ib = b.im, e = a.bounce * b.bounce;\n"
      "    if (ball && this.bolaPe) {   // (Oficina de estádios: a bola do RACHA — o peso no contato e o quique no pé)\n"
      "      if (this.bolaPe.peso > 0) { if (ball === a) ia = 0.5 / this.bolaPe.peso; else ib = 0.5 / this.bolaPe.peso; }\n"
      "      if (this.bolaPe.e != null) e = this.bolaPe.e;\n"
      "    }\n"
      "    const tot = ia + ib;\n    if (tot <= 0) return;\n")
troca("    a.x -= nx * pen * a.im / tot; a.y -= ny * pen * a.im / tot;\n    b.x += nx * pen * b.im / tot; b.y += ny * pen * b.im / tot;\n",
      "    a.x -= nx * pen * ia / tot; a.y -= ny * pen * ia / tot;\n    b.x += nx * pen * ib / tot; b.y += ny * pen * ib / tot;\n")
troca("      const e = a.bounce * b.bounce;\n      const j = -(1 + e) * rv / tot;\n      a.vx -= nx * j * a.im; a.vy -= ny * j * a.im;\n      b.vx += nx * j * b.im; b.vy += ny * j * b.im;\n",
      "      const j = -(1 + e) * rv / tot;\n      a.vx -= nx * j * ia; a.vy -= ny * j * ia;\n      b.vx += nx * j * ib; b.vy += ny * j * ib;\n")
# a velocidade máxima da bola (a do RACHA tem teto), também no caminho previsto que os bots e as linhas usam
troca("    b.vx *= dmp; b.vy *= dmp;\n    if (Math.abs(b.vx) < 0.004 && Math.abs(b.vy) < 0.004) { b.vx = 0; b.vy = 0; }\n",
      "    b.vx *= dmp; b.vy *= dmp;\n"
      "    if (P.ballMax > 0) { const sv = Math.hypot(b.vx, b.vy); if (sv > P.ballMax) { b.vx *= P.ballMax / sv; b.vy *= P.ballMax / sv; } }   // (Oficina de estádios: o teto da bola)\n"
      "    if (Math.abs(b.vx) < 0.004 && Math.abs(b.vy) < 0.004) { b.vx = 0; b.vy = 0; }\n")
troca("      vx *= dmp; vy *= dmp;\n      x += vx; y += vy;\n",
      "      vx *= dmp; vy *= dmp;\n"
      "      if (P.ballMax > 0) { const sv = Math.hypot(vx, vy); if (sv > P.ballMax) { vx *= P.ballMax / sv; vy *= P.ballMax / sv; } }\n"
      "      x += vx; y += vy;\n")
# o andar do RACHA ('direto'): soma a velocidade com teto e, soltou, freia — como a tampinha. No sabão e no mergulho do
# goleiro, o embalo de sempre (com a mesma velocidade de base), para os dois continuarem funcionando.
troca("    let acc = P.accel;\n    if (sprint) acc *= P.sprint;\n",
      "    if (P.andar === 'direto' && !(p.fx.sabao > 0) && !(p.dashCool > 10)) {   // (Oficina de estádios: o andar do RACHA)\n"
      "      let vmax = P.moveMax > 0 ? P.moveMax : P.accel / (1 - P.playerDamp);\n"
      "      if (sprint) vmax *= P.sprint;\n"
      "      if (p.armed || p.superHeld) vmax *= P.kickAccel;\n"
      "      if (p.fx.turbo > 0) vmax *= 1.5;\n"
      "      vmax *= this.zoneAccel(d);\n"
      "      const amp = Math.min(1, Math.hypot(mx, my));\n"
      "      if (amp > 0.02) {\n"
      "        const ac = (P.moveAccel > 0 ? Math.min(1, P.moveAccel) : 1) * vmax;\n"
      "        d.vx += mx * ac; d.vy += my * ac;\n"
      "        const v = Math.hypot(d.vx, d.vy), lim = vmax * amp;\n"
      "        if (v > lim) { d.vx *= lim / v; d.vy *= lim / v; }\n"
      "      } else { const fr = P.moveBrake > 0 ? Math.min(1, P.moveBrake) : 1; d.vx *= 1 - fr; d.vy *= 1 - fr; }\n"
      "      return;\n"
      "    }\n"
      "    let acc = P.andar === 'direto' ? (P.moveMax > 0 ? P.moveMax : P.accel / (1 - P.playerDamp)) * (1 - P.playerDamp) : P.accel;\n"
      "    if (sprint) acc *= P.sprint;\n")
troca("  dampPlayer(p) {\n    const d = p.disc;\n    let dmp = this.P.playerDamp;\n",
      "  dampPlayer(p) {\n    const d = p.disc;\n"
      "    if (this.P.andar === 'direto' && !(p.fx.sabao > 0) && !(p.dashCool > 10)) {   // (Oficina de estádios: o andar do RACHA freia no comando; só a lama freia aqui)\n"
      "      let dz = 1;\n"
      "      for (const z of this.stadium.zones) if (z.playerDamp && (d.x - z.x) ** 2 + (d.y - z.y) ** 2 < z.r * z.r) dz = Math.min(dz, z.playerDamp);\n"
      "      if (dz < 1) { d.vx *= dz; d.vy *= dz; }\n"
      "      return;\n"
      "    }\n"
      "    let dmp = this.P.playerDamp;\n")
# os bots no andar do RACHA: a velocidade máxima é a do estádio e o comando já é a velocidade (não a aceleração)
troca("  return P.accel * P.playerDamp / (1 - P.playerDamp);\n",
      "  if (P.andar === 'direto') return P.moveMax > 0 ? P.moveMax : P.accel / (1 - P.playerDamp);   // (Oficina de estádios)\n"
      "  return P.accel * P.playerDamp / (1 - P.playerDamp);\n")
troca("  const vmax = m.vmax, acc = m.P.accel;\n",
      "  const vmax = m.vmax, acc = m.P.andar === 'direto' ? vmax * (m.P.moveAccel > 0 ? Math.min(1, m.P.moveAccel) : 1) : m.P.accel;\n")
troca("  const want = dist > 0.5 ? Math.min(1, dist / arriveR) : 0;\n",
      "  const want = dist > 0.5 ? Math.min(1, dist / arriveR) : 0;\n"
      "  if (m.P.andar === 'direto') {   // (Oficina de estádios: no andar do RACHA o comando é a velocidade que se quer)\n"
      "    const s = want * speedMul;\n"
      "    inp.mx = dist > 0.5 ? dx / dist * s : 0; inp.my = dist > 0.5 ? dy / dist * s : 0;\n"
      "    inp.sprint = !!sprint && dist > 50;\n"
      "    return;\n"
      "  }\n")

# ---------------------------------------------------------------- 6) v98: o online (o nome de quem joga, embaixo da tampinha dos outros)
troca("    if (p.power && m.mode === 'chaos') {\n      const pw = POWER_BY_ID[p.power];",
      "    if (!p.human && p.nomeRede && !p.rcBot) {   // (RACHA v98 · o online: o nome de quem joga; nos modos de sempre ninguém tem nomeRede)\n"
      "      ctx.font = '800 11px \"Barlow Condensed\", sans-serif'; ctx.textBaseline = 'top';\n"
      "      ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.fillStyle = '#ffffff';\n"
      "      ctx.strokeText(p.nomeRede, 0, r + 5); ctx.fillText(p.nomeRede, 0, r + 5);\n"
      "      ctx.textBaseline = 'middle';\n"
      "    }\n"
      "    if (p.power && m.mode === 'chaos') {\n      const pw = POWER_BY_ID[p.power];")

assert t.count('<script>') == 1 and t.count('</script>') == 5, 'rachão: o script do jogo, a ponte da física, o quadro do online, a Oficina de estádios e o online'
for f in ('estadios.js', 'estadios.css', 'ponte.js', 'quadro.js', 'rede.js'):
    assert (PASTA / f).is_file(), 'rachão: falta app/public/game/rachao/' + f
PASTA.mkdir(parents=True, exist_ok=True)
SAIDA.write_text(t, encoding='utf-8')
print('rachão: app/public/game/rachao/rachao.html ·', len(t.encode('utf-8')), 'bytes · fontes locais:', len(faces), '· original sha256', SHA_ORIGINAL[:16])
