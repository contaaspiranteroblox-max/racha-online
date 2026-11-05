"""RACHA v105 · as tampinhas criadas ficam na conta e a borda BOTÃO é a de todo mundo (aplicada por último, depois da v104).
O pedido (05/11/2026), com as duas imagens das tampinhas de botão listradas na grama: "quando o jogador cria uma skin aí ele
reloga no jogo a skin some" e "quero a borda lisa padrão no jogo, a inicial para geral, e deixe mais parecido: essa borda
parece que tem uma sombra ali por dentro, deixe bem parecido".
- a causa da que sumia: a leitura da racha-tampa-v1 (tools/tampa_rua.js) roda antes de as peças da v76, da v96 e da v102 (a
  BOTÃO) entrarem nas listas — toda tampinha feita com uma delas era recusada ao abrir o jogo (e apagada na gravação seguinte,
  no aparelho e na conta). A leitura agora guarda o que não deu para ler (TP.adiadas) e o cosmeticos.js lê de novo no fim;
- tools/v105/cosmeticos.js: a cópia do progresso vai para a conta logo depois de cada mudança nas tampinhas (e o SAIR DA CONTA
  manda o que falta antes de encerrar a sessão; com o app fechando, o envio sai com keepalive); as tampinhas juntam quando os
  dois lados mudaram (QUAL PROGRESSO FICA? e LEVAR O PROGRESSO PARA A CONTA); a tampinha da conta que o aparelho nunca viu
  entra nas salvas; a inicial e a borda de fábrica aparecem com a BOTÃO (os códigos não mudam) e a BOTÃO fica chapada, como
  nas imagens (sem o relevo, o brilho e a sombra por dentro);
- as trocas de texto abaixo: a hora de cada salva ("t"), a do equipar ("te") e as salvas apagadas ("x") na chave
  racha-tampa-v1 (o tampa_rua.js lê e o tpSalva de sempre grava: nenhuma gravação as perde) e o keepalive no envio da ponte
  da v84 (tools/v84/login_cedo.js, pelo RACHA84.manterViva).
Nada no bloco PHYS muda (o build confere o sha da física)."""
import pathlib
AQUI = pathlib.Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent
SUBS = []
SUBS_PHYS = []

# ---- as horas das tampinhas na chave de sempre (tools/tampa_rua.js: a leitura e o tpSalva)
SUBS.append(("f:s.f === true}));   // v70: f = favorita\n",
             "f:s.f === true, ...(+s.t > 0 ? {t:Math.floor(+s.t)} : {})}));   // v70: f = favorita · v105: t = a hora em que a salva mudou (as tampinhas juntam entre os aparelhos)\n"))
# ---- O DEFEITO DA TAMPINHA QUE SUMIA (a causa): esta leitura roda antes de as peças da v76 (as caras e os aros animados), da
#      v96 e da v102 (a BOTÃO, lugar 27) entrarem nas listas — o tpLe recusava o código de quem usava uma delas (e guardava o
#      "inválido" no TP_LIDOS): a equipada e as salvas sumiam ao abrir o jogo, e a próxima gravação apagava de vez (no aparelho
#      e na conta). Agora o que não dá para ler ainda fica guardado (TP.adiadas) e o tools/v105/cosmeticos.js lê de novo no fim,
#      com todas as peças.
SUBS.append(("    if (tpEhCodigo(o.equipada) && o.equipada[0] === 'T' && tpLe(o.equipada)) TP.equipada = o.equipada;\n",
             "    if (tpEhCodigo(o.equipada) && o.equipada[0] === 'T' && tpLe(o.equipada)) TP.equipada = o.equipada;\n"
             "    if (+o.te > 0 || Array.isArray(o.x)) TP.v105 = {te:+o.te > 0 ? Math.floor(+o.te) : 0, x:Array.isArray(o.x) ? o.x.slice(0, 64) : []};   // v105: a hora do equipar e as salvas apagadas\n"
             "    const adia105 = c => tpEhCodigo(c) && c[0] === 'T' && !tpLe(c);   // v105: as peças da v76, v96 e v102 entram depois: o código fica para ler no fim\n"
             "    if (adia105(o.equipada) || (Array.isArray(o.salvas) && o.salvas.some(s => s && adia105(s.c)))) TP.adiadas = {equipada:adia105(o.equipada) ? o.equipada : '', salvas:Array.isArray(o.salvas) ? o.salvas.slice(0, 24) : []};\n"))
SUBS.append(("function tpSalva(){ try { localStorage.setItem(TP_CHAVE, JSON.stringify({itens:[...TP.itens], salvas:TP.salvas, equipada:TP.equipada})); } catch (_) {} }",
             "function tpSalva(){ try { const h = TP.v105 || {}; localStorage.setItem(TP_CHAVE, JSON.stringify(Object.assign({itens:[...TP.itens], salvas:TP.salvas, equipada:TP.equipada}, h.te > 0 ? {te:h.te} : {}, Array.isArray(h.x) && h.x.length ? {x:h.x} : {}))); } catch (_) {} }   // v105: + te e x (tools/v105/cosmeticos.js)"))

# ---- o envio com keepalive quando o app vai para o fundo ou fecha (a ponte HTTP da v84: tools/v84/login_cedo.js)
SUBS.append(("        credentials: 'include',\n        body: ehQuery ? undefined : corpo\n",
             "        credentials: 'include',\n"
             "        keepalive: !ehQuery && R84.manterViva === true && (typeof TextEncoder === 'function' ? new TextEncoder().encode(corpo).length : corpo.length*3) < 60000,   // v105: com o app fechando, o envio termina\n"
             "        body: ehQuery ? undefined : corpo\n"))

ARQUIVOS = [n for n in ('cosmeticos.js',) if (AQUI / n).exists()]
assert ARQUIVOS == ['cosmeticos.js'], 'falta tools/v105/cosmeticos.js'
CODIGO = '\n'.join('/* ---------------------------------------------------------------- tools/v105/' + n + ' */\n' + (AQUI / n).read_text(encoding='utf-8') for n in ARQUIVOS)
assert '</script' not in CODIGO.lower(), 'o código da v105 não pode ter </script'
SUBS.append(('\nmontaAbas();\nif (onbPrecisa()) onbAbre();',
             '\n/* ======================================================================= RACHA v105 (tools/v105/*.js) */\n' + CODIGO
             + '\nmontaAbas();\nif (onbPrecisa()) onbAbre();'))
