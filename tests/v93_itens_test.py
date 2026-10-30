"""RACHA v93 · Fase 1 — OS ITENS QUE NÃO EQUIPAVAM, com o jogo de verdade (tests/build/racha_teste.html) logado na
PLATAFORMA DE TESTE (tests/plataforma: o código de app/api com SQLite e o servidor das salas no mesmo endereço).
Confere, pelos botões da tela (o popup do item na LOJA e no INVENTÁRIO) e no servidor:
  1. BOLA: comprar e EQUIPAR aparece na hora; a resposta atrasada do estado da loja não desfaz a troca; TIRAR volta ao
     padrão (na tela e na conta);
  2. EFEITO do chute: sai também no chute armado (o botão segurado antes de chegar na bola), no máximo um a cada 180 ms;
  3. PEÇA da tampinha (uma borda comprada): EQUIPAR NA TAMPINHA troca só a borda da sua tampinha e salva na conta;
     o INVENTÁRIO mostra a peça;
  4. TAMPINHA exclusiva (do passe): EQUIPAR direto na loja (EQUIPADA depois) e ela continua na lista DA SUA CONTA do
     editor depois que o editor abre (antes: sumia);
  5. o BANNER de nível do site (Talento da Quadra) aparece nos BANNERS e equipa no jogo;
  6. ITENS DO CARTÃO DA CONTA no INVENTÁRIO: a moldura e o título de nível equipam no cartão;
  7. os cosméticos da v49 presos (o aro na tampinha) voltam ao original;
  8. outra conta no mesmo navegador não vê os itens da anterior (o guardado é por conta);
  9. na SALA: trocar de tampinha 4 vezes seguidas — o outro jogador vê a última (o aviso não se perde no ritmo do servidor),
     e vê o efeito equipado (os cosméticos da conta no cartão da sala).
  python3 tests/v93_itens_test.py
"""
import asyncio, json, os, sys, tempfile, time, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from comum import Placar, RAIZ, CHROME, HARNESS, FONTES, rt
import comum; comum.SKINS_PRONTAS = True   # v101: este teste confere as tampinhas prontas (o interruptor as traz de volta)
from playwright.async_api import async_playwright
from v88_cliente_test import Plataforma, conta, espera, abre_logado, clica_texto


def uid(PL, pub):
    return PL.sql('select id from usuarios where id_publico = ?', [int(pub)])[0]['id']


def da(PL, pub, *codigos):
    u = uid(PL, pub)
    for c in codigos:
        PL.sql("insert or ignore into itens_usuario (usuario_id, codigo_item, origem, origem_detalhe, obtido_em) values (?, ?, 'admin', 'teste v93', ?)", [u, c, int(time.time())])


def saldo(PL, pub, moedas, gemas):
    PL.sql('update carteiras set moedas = ?, gemas = ? where usuario_id = ?', [moedas, gemas, uid(PL, pub)])


async def pop_bt(pg, texto, ms=4000):
    return await espera(pg, "(() => { const b = [...document.querySelectorAll('#pop-caixa .pop-acoes button')].find(x => x.textContent === %s && !x.disabled); if (!b) return false; b.click(); return true; })()" % json.dumps(texto), ms)


async def abre_item(pg, cat, codigo):
    """abre a LOJA na categoria e toca no item (o popup)"""
    await rt(pg, "(() => { try { fechaPop(); } catch (_) {} if (!v88Aberta('loja')) abreTela('loja'); V88S.cat = %s; v88LojaPinta(); return 1; })()" % json.dumps(cat))
    await asyncio.sleep(.3)
    ok = await rt(pg, "(() => { const nome = (v88Item(%s) || {}).nome || nomeDaPeca88(%s); const b = [...document.querySelectorAll('#tela-loja .v88-item')].find(x => x.getAttribute('aria-label') === nome); if (!b) return false; b.click(); return true; })()" % (json.dumps(codigo), json.dumps(codigo)))
    await asyncio.sleep(.25)
    return ok and await rt(pg, "!LB.pop.hidden")


async def principal():
    P = Placar('v93 · Fase 1 · os itens que não equipavam (o jogo logado na plataforma de teste)')
    banco = os.path.join(tempfile.mkdtemp(prefix='racha93i-'), 'plataforma.sqlite')
    PL = Plataforma(banco).sobe()
    erros_todos = []
    try:
        A, B = conta(PL, 'craque93'), conta(PL, 'zagueiro93')
        PL.q('loja.estado', None, A['token']); PL.q('loja.estado', None, B['token'])        # (as carteiras nascem)
        saldo(PL, A['pub'], 50000, 2000)
        da(PL, A['pub'], 'tp_t1_rua', 'banner_talento_quadra', 'moldura_bronze', 'titulo_craque_quebrada')
        async with async_playwright() as pw:
            # (os cosméticos da v49 presos: o aro "coroa" escolhido antes da v69, sem onde trocar)
            ba, pa, ea = await abre_logado(pw, PL, 'craque93')
            erros_todos.append(ea)
            await rt(pa, "(() => { const o = JSON.parse(localStorage.getItem(X49_KEY) || '{}'); o.border = 'crown'; o.uniform = 'stripe'; localStorage.setItem(X49_KEY, JSON.stringify(o)); return 1; })()")
            await pa.reload()
            await espera(pa, "typeof window.__RT === 'function' && v88Logado() && lobby.aberto && V88.carteiraOk", 25000)
            await rt(pa, HARNESS); await rt(pa, "(() => { const o = document.getElementById('onb'); if (o) o.hidden = true; try { fechaPop(); } catch (_) {} return 1; })()")
            x = await rt(pa, "({b:X49.border, u:X49.uniform, c:X49.celebration, salvo:JSON.parse(localStorage.getItem(X49_KEY)).border})")
            P.confere(x['b'] == 'plain' and x['u'] == 'plain' and x['salvo'] == 'plain', '7) os cosméticos da v49 presos (o aro e a faixa na tampinha) voltaram ao original', x)

            print('\n1) a bola: EQUIPAR na hora, sem voltar sozinha, e TIRAR')
            PL.m('loja.comprar', {'codigo': 'bola_rua', 'preco': {'moedas': 1500, 'gemas': 0}}, A['token'])
            PL.m('loja.comprar', {'codigo': 'bola_couro', 'preco': {'moedas': 3000, 'gemas': 0}}, A['token'])
            await rt(pa, "v88Estado(true).then(() => 1)"); await asyncio.sleep(.5)
            ok = await abre_item(pa, 'bolas', 'bola_rua')
            ok = ok and await pop_bt(pa, 'EQUIPAR')
            na_hora = await rt(pa, "v88Equipado('bola')")
            await espera(pa, "!V93E.pend", 6000)
            srv = PL.q('loja.estado', None, A['token'])['equipados']['bola']
            P.confere(ok and na_hora == 'bola_rua' and srv == 'bola_rua', 'EQUIPAR (pelo popup): a bola troca na hora (antes de o servidor responder) e fica na conta', [na_hora, srv])
            # a corrida: o estado da loja sai ANTES do equipar e volta DEPOIS (atrasado) — antes da v93 ele desfazia a troca
            r = await rt(pa, """(() => { const R = v88R84(), api0 = R.api; window.__atraso = 0;
              R.api = function(p){ const pr = api0.apply(this, arguments); return p === 'loja.estado' ? pr.then(x => new Promise(res => setTimeout(() => { window.__atraso++; res(x); }, 900))) : pr; };
              v88Estado(true); setTimeout(() => { R.api = api0; }, 30); setTimeout(() => v88Equipa('bola', 'bola_couro'), 60);
              return 1; })()""")
            await espera(pa, "window.__atraso >= 1 && !V93E.pend", 8000); await asyncio.sleep(.3)
            depois = await rt(pa, "v88Equipado('bola')")
            srv = PL.q('loja.estado', None, A['token'])['equipados']['bola']
            P.confere(depois == 'bola_couro' and srv == 'bola_couro', 'o estado da loja que chegou atrasado (pedido antes do equipar) não desfez a troca', [depois, srv])
            ok = await abre_item(pa, 'bolas', 'bola_couro')
            tem_tirar = await rt(pa, "[...document.querySelectorAll('#pop-caixa .pop-acoes button')].map(b => b.textContent)")
            ok = ok and await pop_bt(pa, 'TIRAR')
            await espera(pa, "!V93E.pend", 6000); await asyncio.sleep(.2)
            srv = PL.q('loja.estado', None, A['token'])['equipados']['bola']
            P.confere(ok and await rt(pa, "v88Equipado('bola')") == 'bola_classica' and srv == 'bola_classica', 'TIRAR (no popup do item equipado): volta à bola clássica, na tela e na conta', [tem_tirar, srv])

            print('\n2) o efeito do chute no chute armado')
            ef = await rt(pa, "(CAT88.itens.find(i => i.tipo === 'efeito' && !i.gratis && (i.moedas || 0) > 0) || {}).id")
            pr = await rt(pa, "(v88Venda(%s) || {})" % json.dumps(ef))
            PL.m('loja.comprar', {'codigo': ef, 'preco': {'moedas': pr['moedas'], 'gemas': pr['gemas']}}, A['token'])
            await rt(pa, "v88Estado(true).then(() => 1)"); await asyncio.sleep(.4)
            await rt(pa, "(() => { v88Equipa('efeito', %s); return 1; })()" % json.dumps(ef))
            await espera(pa, "!V93E.pend", 6000)
            await rt(pa, "(() => { fechaPop(); fechaTela(); jogar(); return 1; })()"); await asyncio.sleep(.8)
            n = await rt(pa, """(() => { V88C.parts.length = 0; P.v93FxT = 0; const a = V88C.parts.length;
              fxChute(P, true, false); const b = V88C.parts.length;     // (o chute armado: o botão não foi apertado agora)
              fxChute(P, true, false); const c = V88C.parts.length;     // (de novo em menos de 180 ms: não repete)
              return [a, b, c]; })()""")
            P.confere(n[1] > n[0] and n[2] == n[1], 'o efeito "%s" sai no chute armado (antes: só quando o botão acabava de ser apertado) e não repete em menos de 180 ms' % ef, n)

            print('\n3) a peça da tampinha: EQUIPAR NA TAMPINHA')
            borda = await rt(pa, "(() => { const D = tpLe(tpMinha()) || TP_PADRAO_D(); return TP_BORDAS.find(x => x.pr !== 'gratis' && x.id !== D.b).id; })()")
            da(PL, A['pub'], 'peca:b:' + borda)
            await rt(pa, "(() => { abrirLobby(); return 1; })()"); await asyncio.sleep(.5)
            await rt(pa, "v88Estado(true).then(() => 1)"); await asyncio.sleep(.4)
            ok = await abre_item(pa, 'inventario', 'peca:b:' + borda)
            bts = await rt(pa, "[...document.querySelectorAll('#pop-caixa .pop-acoes button')].map(b => b.textContent)")
            ok = ok and await pop_bt(pa, 'EQUIPAR NA TAMPINHA')
            await asyncio.sleep(1.2)
            D = await rt(pa, "(tpLe(tpMinha()) || {}).b")
            tampa = PL.sql('select tampa from usuarios where id_publico = ?', [int(A['pub'])])[0]['tampa']
            minha = await rt(pa, "tpMinha()")
            P.confere(ok and D == borda and tampa == minha, 'INVENTÁRIO › a borda › EQUIPAR NA TAMPINHA: só a borda muda na sua tampinha, e a conta guarda (antes: "É SEU" e só FECHAR)', [bts, D, borda, tampa == minha])

            print('\n4) a tampinha exclusiva do passe')
            ok = await abre_item(pa, 'tampinhas', 'tp_t1_rua')
            ok = ok and await pop_bt(pa, 'EQUIPAR')
            await asyncio.sleep(.5)
            eq = await rt(pa, "tpMinha() === v93ExclusivaCod('tp_t1_rua') && v88LojaEstadoDe('tp_t1_rua') === 'equipado'")
            P.confere(ok and eq, 'LOJA › TAMPINHAS › Rei da Rua › EQUIPAR: equipada na hora (e a loja mostra EQUIPADA)', eq)
            await rt(pa, "(() => { ED.contaT = 0; fechaTela(); abreTela('skins'); return 1; })()")
            await asyncio.sleep(2.0)                             # (o editor pede as skins do site à conta)
            lista = await rt(pa, "TP.conta.slice()")
            P.confere('tp_t1_rua' in lista, 'abrir o editor não tira a exclusiva da lista DA SUA CONTA (antes: a lista do site substituía)', lista)
            await rt(pa, "(() => { fechaTela(); return 1; })()")

            print('\n5) e 6) as recompensas de nível do site')
            ok = await abre_item(pa, 'banners', 'banner_talento_quadra')
            ok = ok and await pop_bt(pa, 'EQUIPAR')
            await espera(pa, "!V93E.pend", 6000)
            srv = PL.q('loja.estado', None, A['token'])['equipados']['banner']
            P.confere(ok and srv == 'banner_talento_quadra', 'o banner de nível do site (Talento da Quadra) aparece nos BANNERS do jogo e equipa', srv)
            await rt(pa, "(() => { try { fechaPop(); } catch (_) {} V93E.cartaoT = 0; V88S.cat = 'inventario'; v88LojaPinta(); return 1; })()")
            bloco = await espera(pa, "(() => { const g = document.querySelector('#tela-loja .v93-cartao'); return g ? [...g.querySelectorAll('.v88-item')].map(b => b.getAttribute('aria-label')) : null; })()", 6000)
            ok = await rt(pa, "(() => { const b = [...document.querySelectorAll('#tela-loja .v93-cartao .v88-item')].find(x => x.getAttribute('aria-label') === 'Bronze'); if (!b) return false; b.click(); return true; })()")
            await asyncio.sleep(1.0)
            ok2 = await rt(pa, "(() => { const b = [...document.querySelectorAll('#tela-loja .v93-cartao .v88-item')].find(x => x.getAttribute('aria-label') === 'Craque da Quebrada'); if (!b) return false; b.click(); return true; })()")
            await asyncio.sleep(1.0)
            u = PL.sql('select moldura_equipada as m, titulo_equipado as t from usuarios where id_publico = ?', [int(A['pub'])])[0]
            P.confere(bloco and ok and ok2 and u['m'] == 'moldura_bronze' and u['t'] == 'Craque da Quebrada', 'INVENTÁRIO › ITENS DO CARTÃO DA CONTA: a moldura e o título de nível equipam no cartão (%s)' % ', '.join(bloco or []), u)

            print('\n9) na sala: a tampinha e o efeito para o outro jogador')
            bb, pb, eb = await abre_logado(pw, PL, 'zagueiro93')
            erros_todos.append(eb)
            await espera(pa, "!!NET49.id", 8000); await espera(pb, "!!NET49.id", 8000)
            await rt(pa, "(() => { net49Send({type:'create', n:1, map:4, jogo:'futebol', tempo:0, bots:true, pub:false, name:'teste v93'}); return 1; })()")
            sala = await espera(pa, "NET49.room && NET49.room.code", 8000)
            await rt(pb, "(() => { net49Send({type:'join', code:%s}); return 1; })()" % json.dumps(sala))
            dentro = await espera(pb, "NET49.room && NET49.room.code === %s" % json.dumps(sala), 8000)
            cods = await rt(pa, """(() => { const D = tpLe(tpMinha()), out = [];
              for (const p of TP_PADROES.filter(x => x.pr === 'gratis').slice(0, 4)){ D.p = p.id; const c = tpCodigo(tpNorm(D)); TP.livres.add(c); tpEquipa(c); out.push(c); }
              return out; })()""")
            idA = await rt(pa, "NET49.id")
            ultima = await espera(pb, "(() => { const m = NET49.room && NET49.room.members.find(x => x.id === %s); return m && m.skin === %s ? m.skin : ''; })()" % (json.dumps(idA), json.dumps(cods[-1])), 9000, 300)
            cosA = await rt(pb, "(() => { const m = NET49.room.members.find(x => x.id === %s); return m && m.cos; })()" % json.dumps(idA))
            P.confere(dentro and ultima == cods[-1], 'trocou de tampinha 4 vezes seguidas: o outro jogador vê a ÚLTIMA (antes: o servidor descartava os avisos além do ritmo)', [len(cods), ultima == cods[-1]])
            P.confere(cosA and cosA.get('efeito') == ef and cosA.get('banner') == 'banner_talento_quadra', 'o cartão da sala leva os cosméticos da conta (o efeito e o banner equipados) para os outros', cosA)
            await rt(pa, "(() => { net49Send({type:'leave'}); return 1; })()"); await rt(pb, "(() => { net49Send({type:'leave'}); return 1; })()")
            await bb.close()

            print('\n8) outra conta no mesmo navegador')
            await rt(pa, "(() => { v88Equipa('bola', 'bola_rua'); return 1; })()"); await espera(pa, "!V93E.pend", 6000)
            guardado = await rt(pa, "JSON.parse(localStorage.getItem('racha88-equip') || '{}').__dono")
            await rt(pa, "(() => { const o = JSON.parse(localStorage.getItem('racha88-equip')); o.__dono = '009999'; localStorage.setItem('racha88-equip', JSON.stringify(o)); V88.equip.__dono = '009999'; return 1; })()")
            outra = await rt(pa, "v88Equipado('bola')")
            P.confere(guardado == str(A['pub']).zfill(6) and outra == 'bola_classica', 'o equipado guardado no aparelho é da conta: o de outra conta não vale (até o servidor responder, o padrão)', [guardado, outra])
            await rt(pa, "(() => { v88Esquece(); return 1; })()")
            P.confere(await rt(pa, "!localStorage.getItem('racha88-equip') && Object.keys(V88.equip).length === 0"), 'ao sair da conta, os itens equipados dela saem do aparelho', await rt(pa, "localStorage.getItem('racha88-equip')"))
            await ba.close()
        erros = [e for l in erros_todos for e in l if 'Failed to load resource' not in e and 'WebSocket' not in e]
        P.confere(not erros, 'nenhum erro de JavaScript', erros[:4])
    finally:
        PL.desce()
    return P.fim()


if __name__ == '__main__':
    sys.exit(asyncio.run(principal()))
