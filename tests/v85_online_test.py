"""RACHA v85 · o online de ponta a ponta com o JOGO DE VERDADE: duas sessões do jogo no navegador numa sala hospedada no
servidor (a partida simulada no servidor desde a v83), mandando os comandos do jeito do jogo (o analógico e os botões) —
o caminho que a FR-85 mudou: o analógico de 256 direções e o campo `acao` (bits) no lugar do `button`.

Confere, pelos quadros do servidor (o que os outros veem):
  · os comandos que o jogo manda: o analógico em direções de 1/256 de volta e os botões em bits (`acao`), sem `button`;
  · a tampinha corre na direção do analógico, na velocidade de corrida (VEL_JOG), e para ao soltar;
  · o PASSE (Espaço) de quem dá a saída e o CHUTE (K) do outro saem no servidor com a velocidade da FR-85;
  · nenhum erro de JavaScript.
Sobe o servidor de verdade pelo tests/servidor_visitantes.cjs (o mesmo server/servidor.js, aceitando quem joga sem conta:
ver o arnês da v84 em tests/online_test.py). Com RACHA_V84=1 roda na v84 (antes da FR-85): aí só as verificações de jogo
valem (anda, para, chuta), e o teste diz qual campo de botão o jogo manda.
Uso: python3 tests/v85_online_test.py"""
import asyncio, json, math, os, subprocess, sys, time
from comum import Placar, rt, async_playwright, RAIZ
from online_test import porta_livre, sessao, espera

V84 = os.environ.get('RACHA_V84') == '1'

VAI = r"""((tecla, modo) => {       // vai até a bola e aperta a tecla; para quando o servidor diz que chutou
  // modo 'baixo': chega por baixo da bola (o chute vai para cima); modo 'campo': chega pelo lado de fora (o chute vai para o
  // meio da quadra, longe das linhas: a velocidade medida no quadro seguinte não tem batida na linha no meio)
  const V = window.__vai = {fim:false, chutou:false, t0:performance.now(), ct0:P.chuteT, tecla, apertou:0, v:null, d:null, fase:'chega'};
  const R = JOY.max*hud.joy.al; joy.id = 77;
  const solta = () => { joy.id = null; joy.dx = joy.dy = 0; keys[tecla] = false; };
  const it = setInterval(() => {
    if (P.chuteT !== V.ct0){ V.chutou = true; V.fim = true; V.v = Math.hypot(B.vx, B.vy); V.dir = Math.atan2(B.vy, B.vx); V.bx = B.x; V.by = B.y; clearInterval(it); solta(); return; }
    if (performance.now() - V.t0 > 9000){ V.fim = true; clearInterval(it); solta(); return; }
    let nx = 0, ny = 1;
    if (modo === 'campo'){ const ex = B.x - CX, ey = B.y - CY, el = Math.hypot(ex, ey) || 1; nx = ex/el; ny = ey/el; }
    const off = R_JOG + B.r + U(0.9);
    let tx = B.x, ty = B.y;
    if (V.fase === 'chega'){ tx = B.x + nx*off; ty = B.y + ny*off; if (Math.hypot(tx - P.x, ty - P.y) < U(0.7)) V.fase = 'bola'; }
    const dx = tx - P.x, dy = ty - P.y, d = Math.hypot(dx, dy) || 1;
    joy.dx = dx/d*R; joy.dy = dy/d*R;
    V.d = Math.hypot(B.x - P.x, B.y - P.y);
    if (V.fase === 'bola' && V.d <= ALCANCE_CHUTE + U(1)){ keys[tecla] = true; V.apertou++; }
  }, 25);
  return 1;
})"""


async def principal():
    P = Placar('v85 · o online de ponta a ponta com o jogo de verdade' + (' (na v84)' if V84 else ''))
    porta = porta_livre()
    srv = subprocess.Popen(['node', str(RAIZ / 'tests' / 'servidor_visitantes.cjs'), '--porta', str(porta), '--host', '127.0.0.1', '--memoria',
                            '--estaticos', str(RAIZ), '--nome', 'Teste v85', '--sem-p2p'], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    time.sleep(0.8)
    url = 'http://127.0.0.1:%d/tests/build/racha_teste.html' % porta
    sess = []
    enviados = {'A': [], 'B': []}
    async with async_playwright() as pw:
        try:
            A = await sessao(pw, url, 'Ana'); B = await sessao(pw, url, 'Beto'); sess += [A, B]
            for nome, pg in (('A', A), ('B', B)):
                pg.on('websocket', lambda ws, n=nome: ws.on('framesent', lambda carga, n=n: enviados[n].append(carga)))
                await rt(pg, "abreTela('amigos')")
            P.confere(bool(await espera(A, "!!NET49.id", 8000)) and bool(await espera(B, "!!NET49.id", 8000)), 'as duas sessões conectam no servidor da turma')
            # a sala hospedada: a Ana cria (é a admin), o Beto entra no Time B, a Ana vai para o Time A e começa
            await rt(A, "(() => { Object.assign(SX.form, {onde:'online', pub:true, n:1, map:0, jogo:'futebol', tempo:0, bots:false, nome:'Sala v85'}); sxCriar(); return 1; })()")
            cod = await espera(A, "NET49.room && NET49.room.code", 6000)
            await rt(B, "(() => { net49Send({type:'join', code:%s, slot:1}); return 1; })()" % json.dumps(cod))
            await espera(A, "NET49.room && NET49.room.members.length === 2", 6000)
            await rt(A, "document.querySelector('.v70-sl-atalhos .entrar').click()")
            await espera(A, "NET49.room.roster.indexOf(NET49.id) >= 0 && NET49.room.roster.every(Boolean)", 6000)
            sala = await rt(A, "({host:NET49.room.host, servidor:!!NET49.room.servidor, roster:NET49.room.roster.slice()})")
            P.confere(sala['servidor'] and sala['host'] == 'srv', 'a sala é hospedada no servidor (ninguém é anfitrião)', sala)
            await rt(A, "slIniciar()")
            JOGA = "NET49.playing && !NET49.host && NET49.localSlot >= 0 && NET49.lastTick > 0"
            ja = await espera(A, JOGA, 8000); jb = await espera(B, JOGA, 8000)
            P.confere(bool(ja and jb), 'a partida começa nas duas sessões (as duas recebem os quadros do servidor)')
            for pg in (A, B):
                await rt(pg, "(() => { filaPop.length = 0; if (!LB.pop.hidden) fechaPop(); return 1; })()")
            K = await rt(A, "({VEL_JOG, R_JOG, ALCANCE_CHUTE, U1:U(1), nf:typeof NF !== 'undefined' ? {dir:NF.DIRECOES, passe:NF.CHUTE.passe, forte:NF.CHUTE.forte, embalo:NF.CHUTE.embalo, raspao:NF.CHUTE.raspao} : null})")
            DIR = K['nf']['dir'] if K['nf'] else 32
            sB = await rt(B, "NET49.localSlot"); sA = await rt(A, "NET49.localSlot")
            # ------------------------------------------------ 1) o analógico: corre na direção apontada e para ao soltar
            print('\n1) o analógico na sala hospedada')
            ang = math.radians(-80)
            await asyncio.sleep(0.4)
            await rt(B, "(() => { const R = JOY.max*hud.joy.al; joy.id = 77; joy.dx = Math.cos(%r)*R; joy.dy = Math.sin(%r)*R; return 1; })()" % (ang, ang))
            await asyncio.sleep(0.55)
            vB = await rt(A, "(s => { const q = RQ.jog[s]; return {v:Math.hypot(q.vx, q.vy), a:Math.atan2(q.vy, q.vx), x:q.x, y:q.y}; })(%d)" % sB)
            await rt(B, "(() => { joy.id = null; joy.dx = joy.dy = 0; return 1; })()")
            await asyncio.sleep(0.35)
            pB = await rt(A, "(s => { const q = RQ.jog[s]; return {v:Math.hypot(q.vx, q.vy), x:q.x, y:q.y}; })(%d)" % sB)
            S = 2*math.pi/DIR
            k = round(ang/S)
            P.confere(abs(vB['v'] - K['VEL_JOG']) < 0.04*K['VEL_JOG'], 'no servidor, a tampinha do Beto corre na velocidade de corrida (%.1f px/s; VEL_JOG = %.1f)' % (vB['v'], K['VEL_JOG']), vB)
            P.confere(abs(vB['a'] - k*S) < 0.02, 'na direção apontada, arredondada a 1/%d de volta (%.3f rad; esperado %.3f)' % (DIR, vB['a'], k*S), vB)
            P.confere(pB['v'] < 1, 'soltou o analógico: a tampinha para', pB)
            # os comandos que o Beto mandou
            cmds = []
            for c in enviados['B']:
                try:
                    m = json.loads(c)
                except Exception:
                    continue
                if m.get('type') == 'input':
                    cmds.append(m)
            mov = [m for m in cmds if m.get('x') or m.get('y')]
            campos = sorted(set().union(*[set(m.keys()) for m in cmds])) if cmds else []
            if V84:
                print('  (v84: o jogo manda os botões no campo %s)' % ('button' if 'button' in campos else 'acao' if 'acao' in campos else '?'))
            else:
                P.confere(cmds and all('acao' in m and 'button' not in m for m in cmds), 'os comandos do jogo levam os botões em bits (acao) e não têm mais o button', campos)
            quant = [abs(math.atan2(m['y'], m['x'])/S - round(math.atan2(m['y'], m['x'])/S)) < 1e-6 and abs(math.hypot(m['x'], m['y']) - 1) < 1e-9 for m in mov]
            P.confere(len(mov) > 10 and all(quant), 'o analógico vai na rede como direção de 1/%d de volta, com força 1 (%d comandos andando)' % (DIR, len(mov)), mov[:2])
            # ------------------------------------------------ 2) os botões: o PASSE de quem dá a saída e o CHUTE do outro
            print('\n2) os botões na sala hospedada: PASSE e CHUTE')
            saida = await rt(A, "RQ.saidaTime")
            tA = await rt(A, "P.time"); tB = await rt(B, "P.time")
            prim, seg = (A, B) if tA == saida else (B, A)
            await rt(prim, VAI + "('Space', 'baixo')")
            r1 = await espera(prim, "window.__vai && window.__vai.fim ? window.__vai : null", 11000)
            P.confere(bool(r1) and r1['chutou'], 'quem dá a saída vai até a bola e o PASSE (Espaço) sai no servidor', r1)
            if K['nf'] and r1 and r1['chutou']:
                ini, teto = K['nf']['passe'], (K['nf']['passe'] + K['nf']['embalo']*K['VEL_JOG'])*1.05   # (os números do núcleo já estão em px/s)
                P.confere(0.9*ini <= r1['v'] <= teto, 'o passe sai com a velocidade da FR-85 (%.0f px/s; a saída é %.0f px/s, mais o embalo até %.0f)' % (r1['v'], ini, teto), r1)
            elif r1 and r1['chutou']:
                P.confere(r1['v'] > 1.2*K['VEL_JOG'], 'o passe sai mais rápido que a corrida (%.0f px/s)' % r1['v'], r1)
            await espera(seg, "Math.hypot(B.vx, B.vy) < 40 ? 1 : 0", 6000)   # (espera a bola quase parar: o chute de agora é medido sozinho)
            await rt(seg, VAI + "('KeyK', 'campo')")
            r2 = await espera(seg, "window.__vai && window.__vai.fim ? window.__vai : null", 11000)
            P.confere(bool(r2) and r2['chutou'], 'o outro vai atrás da bola e o CHUTE (K) sai no servidor', r2)
            if K['nf'] and r2 and r2['chutou']:
                ini = K['nf']['forte']
                teto = (K['nf']['forte'] + K['nf']['embalo']*K['VEL_JOG'] + K['nf']['raspao']*K['nf']['passe'])*1.05   # (o raspão: 20% do que a bola tinha de lado)
                P.confere(0.9*ini <= r2['v'] <= teto, 'o chute sai com a velocidade da FR-85 (%.0f px/s; a saída é %.0f px/s, mais embalo e raspão até %.0f)' % (r2['v'], ini, teto), r2)
            elif r2 and r2['chutou']:
                P.confere(r2['v'] > 2*K['VEL_JOG'], 'o chute sai bem mais rápido que a corrida (%.0f px/s)' % r2['v'], r2)
            if not V84:
                todos = [json.loads(c) for c in enviados['A'] + enviados['B'] if c.startswith('{"type":"input"')]
                P.confere(any(m.get('acao') == 1 for m in todos) and any(m.get('acao') == 2 for m in todos), 'na rede: o PASSE vai como acao 1 e o CHUTE como acao 2', sorted(set(m.get('acao') for m in todos)))
            erros = [e for pg in sess for e in pg.erros if 'Failed to load resource' not in e]
            P.confere(not erros, 'nenhum erro de JavaScript nas duas sessões', erros[:3])
        finally:
            for pg in sess:
                try:
                    await pg.b.close()
                except Exception:
                    pass
            srv.terminate()
    return P.fim()

if __name__ == '__main__':
    sys.exit(asyncio.run(principal()))
