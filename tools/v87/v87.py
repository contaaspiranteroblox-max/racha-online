"""v87 (aplicado por último, depois da v84): TUDO DENTRO DO JOGO.
O site abre o jogo direto, em tela cheia (a raiz da plataforma leva a /game/racha.html), e o jogo faz o resto sozinho:
  · o login é o do jogo (v84), agora com a cara do jogo (tools/v87/site.js, o estilo #v87css);
  · quem já tem a sessão do site no mesmo endereço (o cookie racha_sessao) entra direto — sem o token no aparelho, o
    v84Inicia pergunta ao auth.eu antes de mostrar o formulário (RACHA84.cookie);
  · as páginas da conta que só existem no site abrem por cima do jogo, pelos botões que já existiam (AMIGOS do lobby, o
    ABRIR AMIGOS da tela AMIGOS, o ABRIR O PERFIL DA CONTA, o VER PERFIL do chat) — v87Abre / v87TemSite;
  · o RACHA CONTROL (a equipe) em Ajustes › Conta, ao lado do SAIR DA CONTA da v84.
Trocas exatas no jogo gerado, como as das outras etapas (falham alto se o texto mudar)."""
import pathlib
AQUI = pathlib.Path(__file__).resolve().parent
SUBS = []

# ---- a sessão do site vale no jogo (login_cedo.js da v84: o RACHA84 lembra que a conta veio do cookie, sem token)
SUBS.append(("    token: le('racha84_token') || null,\n",
             "    token: le('racha84_token') || null,\n"
             "    cookie: le('racha84_cookie') === '1',          // v87: a sessão do site no mesmo endereço (o cookie), sem token no aparelho\n"))
SUBS.append(("    logado: function(){ return !!(R84.eu && R84.token); },\n",
             "    logado: function(){ return !!(R84.eu && (R84.token || R84.cookie)); },\n"))
SUBS.append(("      if (res.token){ R84.token = String(res.token); grava('racha84_token', R84.token); }\n",
             "      if (res.token){ R84.token = String(res.token); grava('racha84_token', R84.token); R84.cookie = false; grava('racha84_cookie', null); }\n"
             "      else if (res.cookie){ R84.cookie = true; grava('racha84_cookie', '1'); }   // v87: entrou pela sessão do site\n"))
SUBS.append(("      R84.eu = null; R84.token = null;\n      grava('racha84_token', null); grava('racha84_conta', null);\n",
             "      R84.eu = null; R84.token = null; R84.cookie = false;\n      grava('racha84_token', null); grava('racha84_conta', null); grava('racha84_cookie', null);\n"))
SUBS.append(("  if (cache && cache.idPublico && R84.token) R84.eu = cache;\n  else if (!R84.token){ grava('racha84_conta', null); }\n",
             "  if (cache && cache.idPublico && (R84.token || R84.cookie)) R84.eu = cache;\n  else if (!R84.token && !R84.cookie){ grava('racha84_conta', null); }\n"))

# ---- o v84Inicia (login.js): a sessão do aparelho (token ou cookie) é conferida; sem ela, o cookie do site é perguntado
SUBS.append(("  if (R.eu && R.token){\n    v84Monta(); v84Estado('verificando');\n",
             "  if (R.eu && (R.token || R.cookie)){\n    v84Monta(); v84Estado('verificando');\n"))
SUBS.append(("    return;\n  }\n  v84Monta(); v84Form('entrar');\n}\n",
             "    return;\n  }\n"
             "  // v87: sem a sessão no aparelho, vale a do site neste mesmo endereço (o cookie): quem já entrou pelo site entra direto\n"
             "  // no jogo, sem pedir a senha de novo. Sem sessão — ou sem a plataforma (o servidor das salas, o GitHub Pages) —, o\n"
             "  // formulário de sempre. O SÓ TREINAR OFFLINE já aparece enquanto confere.\n"
             "  v84Monta(); v84Estado('verificando'); v84BotaoOffline(V84.caixa);\n"
             "  R.api('auth.eu', undefined, true).then(res => {\n"
             "    if (!V84.tela) return;                               // (escolheu SÓ TREINAR OFFLINE enquanto conferia)\n"
             "    if (res && res.logado && res.conta){\n"
             "      R.entrou({ conta: res.conta, cookie: true });\n"
             "      if ('c' + String(Number(res.conta.idPublico)) !== R82.dono){ location.reload(); return; }\n"
             "      v84Fecha(); v84DepoisDoLogin();\n"
             "    } else v84Form('entrar');\n"
             "  }).catch(() => { if (V84.tela) v84Form('entrar'); });\n"
             "}\n"))

# ---- as páginas da conta pelos botões que já existiam: o painel por cima do jogo quando não há site por fora
SUBS.append(("cmBt('amarelo', 'ABRIR AMIGOS', () => { const p = window.parent; try { if (p && p !== window && typeof p.RACHA_ABRIR === 'function') p.RACHA_ABRIR('/amigos'); } catch (_) {} })",
             "cmBt('amarelo', 'ABRIR AMIGOS', () => { som.clique(); v87Abre('/amigos'); })"))
SUBS.append(("      if (typeof window.parent.RACHA_ABRIR === 'function') a.appendChild(botaoPop('ABRIR O PERFIL DA CONTA', 'verde', () => { som.clique(); fechaPop(); try { window.parent.RACHA_ABRIR('/perfil'); } catch (_) {} }));\n",
             "      if (v87TemSite()) a.appendChild(botaoPop('ABRIR O PERFIL DA CONTA', 'verde', () => { som.clique(); fechaPop(); v87Abre('/perfil'); }));   // v87: também sem o site por fora\n"))
SUBS.append(("  try { const p = window.parent; if (p && p !== window && typeof p.RACHA_ABRIR === 'function' && p.RACHA_ABRIR('/amigos')) return; } catch (_) {}\n  abreTela('comunidade');\n",
             "  if (v87Abre('/amigos')) return;                          // v87: os amigos da conta (pelo site por fora ou no painel por cima do jogo)\n  abreTela('comunidade');\n"))
SUBS.append(("  let p = null; try { p = window.parent !== window && typeof window.parent.RACHA_ABRIR === 'function' ? window.parent : null; } catch (_) { p = null; }\n"
             "  if (conta && p) bt('VER PERFIL', 'perfil', 'amarelo', () => { som.clique(); try { p.RACHA_ABRIR('/jogador/' + conta); } catch (_) {} c81FichaFecha(); if (!lobby.aberto) cbFecha(); });\n",
             "  if (conta && v87TemSite()) bt('VER PERFIL', 'perfil', 'amarelo', () => { som.clique(); v87Abre('/jogador/' + conta); c81FichaFecha(); if (!lobby.aberto) cbFecha(); });   // v87: também sem o site por fora\n"))

# ---- v87.2: o presente de TESTE (moedas e gemas) também na produção, quando o config.js pede — para testar a loja à vontade
SUBS.append(("const PRESENTE = {id:'v32', m:50000, g:5000};        // v32: presente que cada aparelho recebe uma vez (moedas e gemas): mude o id para dar outro\n",
             "const PRESENTE = {id:'v32', m:50000, g:5000};        // v32: presente que cada aparelho recebe uma vez (moedas e gemas): mude o id para dar outro\n"
             "// v87.2: o presente de teste também na PRODUÇÃO quando o config.js pede: presente: true (50.000 moedas e 5.000 gemas, uma vez\n"
             "// por aparelho e por conta) ou presente: {id, moedas, gemas} (outro valor; um id novo dá de novo). Na demonstração ele já vinha\n"
             "// (presente: false tira). Sem o pedido no config.js, nada muda.\n"
             "function presenteTeste(){\n"
             "  const c = window.RACHA_CONFIG || {}, p = c.presente;\n"
             "  if (window.RACHA_MODO === 'demo') return p !== false;\n"
             "  if (p === true){ PRESENTE.id = 'teste-v87'; return true; }   // (um id novo: quem ganhou o v32 lá atrás também recebe)\n"
             "  if (!p || typeof p !== 'object') return false;\n"
             "  PRESENTE.id = 'teste-' + (typeof p.id === 'string' && /^[a-z0-9_-]{1,24}$/i.test(p.id) ? p.id : 'v87');\n"
             "  if (Number.isFinite(+p.moedas)) PRESENTE.m = Math.max(0, Math.min(1e7, Math.floor(+p.moedas)));\n"
             "  if (Number.isFinite(+p.gemas)) PRESENTE.g = Math.max(0, Math.min(1e6, Math.floor(+p.gemas)));\n"
             "  return PRESENTE.m > 0 || PRESENTE.g > 0;\n"
             "}\n"))
SUBS.append(("  if (window.RACHA_MODO === 'demo' && !(window.RACHA_CONFIG && window.RACHA_CONFIG.presente === false) && CONTA.presentes.indexOf(PRESENTE.id) < 0){      // v32: o presente (uma vez por aparelho) · v70: só na DEMONSTRAÇÃO (presente:false tira)",
             "  if (presenteTeste() && CONTA.presentes.indexOf(PRESENTE.id) < 0){      // v32: o presente (uma vez por aparelho) · v70: na DEMONSTRAÇÃO (presente:false tira) · v87.2: e na produção com presente no config.js"))

# ---- o código da v87 entra logo depois do login.js (o fim dele: o código de recuperação guardado antes do jogo reabrir)
SUBS.append(("    setTimeout(() => { v84Monta(); v84Codigo(cod84); }, 400);\n  }\n} catch (_) {}\n",
             "    setTimeout(() => { v84Monta(); v84Codigo(cod84); }, 400);\n  }\n} catch (_) {}\n" + (AQUI / 'site.js').read_text(encoding='utf-8')))
