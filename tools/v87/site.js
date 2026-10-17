/* ================================================================ v87: TUDO DENTRO DO JOGO
   O site (a plataforma) abre o jogo direto, em tela cheia, sem a barra de cima e sem as abas: o login é o do jogo
   (o da v84, agora com a cara do jogo) e as coisas da conta ficam nos botões que o jogo já tem — o perfil, os amigos, o
   ranking, a tampinha, os Ajustes (onde fica o SAIR DA CONTA). O que só existe no site (os amigos da conta, o perfil da
   conta, a carreira, as conquistas, o inventário da conta, o perfil de outro jogador) abre POR CIMA do jogo, num painel
   com o VOLTAR AO JOGO: o jogo continua aberto embaixo, do jeito que estava. Quem é da equipe ganha o RACHA CONTROL em
   Ajustes › Conta. Quem já entrou pelo site entra direto (a sessão do mesmo endereço vale: ver o v84Inicia). */
const V87 = {tela:null, frame:null, rota:''};
const V87_ROTAS = /^\/(amigos|ranking|perfil|conquistas|inventario|carreira|estatisticas)$|^\/jogador\/\d{1,9}$/;
V70C_LISTA.splice(1, 0, {q:'#v87site', fecha:() => { som.clique(); v87FechaSite(); }, modal:true, foco:'.v87-volta'});   // (Esc fecha; o resto fica inerte)
(function v87Css(){
  if (document.getElementById('v87css')) return;
  const s = document.createElement('style'); s.id = 'v87css';
  // o login da v84 com a cara do jogo (o cinza-carvão das janelas, o amarelo dos botões, o contorno de tinta, a Lilita One);
  // "body #v84auth" ganha do estilo da v84 qualquer que seja a ordem (ele entra quando o login abre)
  s.textContent = `
body #v84auth{background:radial-gradient(120% 100% at 50% 0%, #3a3f44 0%, #1a1d1f 55%, #0c0e0f 100%)}
body #v84auth .v84-card{background:linear-gradient(#31363a,#1a1d1f);border:0;border-radius:22px;color:#f1f1ee;box-shadow:inset 0 0 0 3px rgba(255,255,255,.13), 0 22px 50px rgba(0,0,0,.55)}
body #v84auth .v84-logo{font-family:"Lilita One","Arial Black",Impact,system-ui,sans-serif;font-weight:400;letter-spacing:.06em;color:#f4bd32;text-shadow:-3px -3px 0 #0c0e0f,3px -3px 0 #0c0e0f,-3px 3px 0 #0c0e0f,3px 3px 0 #0c0e0f,0 6px 0 #0c0e0f}
body #v84auth .v84-sub,body #v84auth .v84-nota,body #v84auth .v84-termos{color:#c6d2ee;font-family:'Barlow',system-ui,sans-serif}
body #v84auth .v84-abas{background:#16181a;border:2px solid #0c0e0f;border-radius:14px}
body #v84auth .v84-abas button{font-family:"Lilita One","Arial Black",Impact,system-ui,sans-serif;font-weight:400;font-size:14px;color:#c6d2ee}
body #v84auth .v84-abas button.at{background:#f4bd32;color:#0c0e0f;box-shadow:0 3px 0 #0c0e0f}
body #v84auth label.v84-cp>span{color:#c6d2ee;font-family:'Barlow Condensed',system-ui,sans-serif;font-weight:700}
body #v84auth input[type=text],body #v84auth input[type=email],body #v84auth input[type=password]{background:#16181a;border:2px solid #3a3f44;border-radius:12px;color:#f1f1ee;font-family:'Barlow',system-ui,sans-serif}
body #v84auth input:focus{border-color:#f4bd32}
body #v84auth .v84-senha button{color:#c6d2ee}
body #v84auth .v84-go{background:#f4bd32;color:#0c0e0f;border:3px solid #0c0e0f;border-radius:14px;box-shadow:0 5px 0 #0c0e0f;font-family:"Lilita One","Arial Black",Impact,system-ui,sans-serif;font-weight:400;font-size:19px;letter-spacing:.04em}
body #v84auth .v84-go:active{transform:translateY(3px);box-shadow:0 2px 0 #0c0e0f}
body #v84auth .v84-alt{background:#484e51;color:#ffffff;border:3px solid #0c0e0f;border-radius:14px;box-shadow:0 4px 0 #0c0e0f;font-family:"Lilita One","Arial Black",Impact,system-ui,sans-serif;font-weight:400;font-size:16px;letter-spacing:.03em}
body #v84auth .v84-alt:active{transform:translateY(2px);box-shadow:0 2px 0 #0c0e0f}
body #v84auth .v84-link{color:#f4bd32;font-family:'Barlow Condensed',system-ui,sans-serif;font-weight:700}
body #v84auth .v84-termos input{accent-color:#f4bd32}
body #v84auth .v84-erro{background:#3b1d14;color:#ffb8a3;border:2px solid #d96f45}
body #v84auth .v84-okm{background:#14301f;color:#9fe0b8;border:2px solid #4db27c}
body #v84auth .v84-cod{background:#16181a;border:2px dashed #f4bd32;color:#f4bd32}
body #v84auth .v84-ver{color:#c6d2ee;font-family:'Barlow',system-ui,sans-serif}
body #v84auth .v84-ver b{color:#f4bd32;font-family:"Lilita One","Arial Black",Impact,system-ui,sans-serif;font-weight:400}
#v87site{position:fixed;inset:0;z-index:9000;display:flex;flex-direction:column;background:#0c0e0f}
#v87site .v87-bar{flex:none;display:flex;align-items:center;gap:14px;padding:8px max(12px, env(safe-area-inset-right)) 8px max(12px, env(safe-area-inset-left));background:linear-gradient(#31363a,#1a1d1f);box-shadow:0 3px 0 #0c0e0f;position:relative;z-index:1}
#v87site .v87-volta{flex:none;border:3px solid #0c0e0f;border-radius:12px;background:#f4bd32;color:#0c0e0f;font-family:"Lilita One","Arial Black",Impact,system-ui,sans-serif;font-size:17px;letter-spacing:.03em;padding:6px 14px;box-shadow:0 4px 0 #0c0e0f;cursor:pointer}
#v87site .v87-volta:active{transform:translateY(2px);box-shadow:0 2px 0 #0c0e0f}
#v87site .v87-tit{color:#f1f1ee;font-family:"Lilita One","Arial Black",Impact,system-ui,sans-serif;font-weight:400;font-size:17px;letter-spacing:.06em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#v87site .v87-frame{flex:1;width:100%;min-height:0;border:0;background:#0d0b1e}
body .v87-admin{margin-top:10px}
@media (max-height:540px){
  body #v84auth{align-items:flex-start;padding:8px 12px}
  body #v84auth .v84-card{max-width:520px;padding:12px 18px 14px;border-radius:18px}
  body #v84auth .v84-logo{font-size:36px}
  body #v84auth .v84-sub{margin:4px 0 10px;font-size:12px}
  body #v84auth .v84-abas{margin-bottom:10px}
  body #v84auth .v84-abas button{padding:7px 6px}
  body #v84auth label.v84-cp{margin-bottom:8px}
  body #v84auth label.v84-cp>span{margin-bottom:3px}
  body #v84auth input[type=text],body #v84auth input[type=email],body #v84auth input[type=password]{padding:8px 10px}
  body #v84auth .v84-go{padding:9px;margin-top:4px}
  body #v84auth .v84-alt{padding:8px;margin-top:6px}
  body #v84auth .v84-nota{margin:6px 0}
}
@media (max-height:430px){ body #v84auth .v84-sub{display:none} body #v84auth .v84-logo{font-size:30px;margin-bottom:8px} }`;
  document.head.appendChild(s);
})();
function v87PodeSite(){                                   // sem um site por fora, com a plataforma e com a conta: o painel abre aqui
  const R = window.RACHA84;
  return !!(R && !R.embutido && R.base() && R.logado());
}
function v87TemSite(){                                    // dá para abrir uma página da conta (pelo site por fora ou pelo painel daqui)
  try { const p = window.parent; if (p && p !== window && typeof p.RACHA_ABRIR === 'function') return true; } catch (_) {}
  return v87PodeSite();
}
const V87_TITULOS = {'/amigos':'AMIGOS DA CONTA', '/ranking':'RANKING', '/perfil':'PERFIL DA CONTA', '/conquistas':'CONQUISTAS',
  '/inventario':'INVENTÁRIO DA CONTA', '/carreira':'CARREIRA', '/estatisticas':'ESTATÍSTICAS'};
function v87Abre(rota){                                   // a página da conta: pelo site que hospeda o jogo ou no painel por cima do jogo
  try { const p = window.parent; if (p && p !== window && typeof p.RACHA_ABRIR === 'function' && p.RACHA_ABRIR(rota)) return true; } catch (_) {}
  if (!V87_ROTAS.test(rota) || !v87PodeSite()) return false;
  v87FechaSite();
  const t = nodo('div'); t.id = 'v87site'; t.setAttribute('role', 'dialog'); t.setAttribute('aria-modal', 'true'); t.setAttribute('aria-label', 'Conta do RACHA');
  const bar = nodo('div', 'v87-bar'), volta = novoBotao('v87-volta'); volta.textContent = '‹ VOLTAR AO JOGO';
  volta.addEventListener('click', () => { som.clique(); v87FechaSite(); });
  bar.append(volta, nodo('b', 'v87-tit', V87_TITULOS[rota] || (/^\/jogador\//.test(rota) ? 'PERFIL DO JOGADOR' : 'CONTA DO RACHA')));
  const f = document.createElement('iframe'); f.className = 'v87-frame'; f.title = 'Conta do RACHA';
  f.src = window.RACHA84.base() + rota;
  t.append(bar, f); document.body.appendChild(t);
  V87.tela = t; V87.frame = f; V87.rota = rota;
  setTimeout(() => { try { volta.focus(); } catch (_) {} }, 60);
  return true;
}
function v87FechaSite(){ if (V87.tela){ V87.tela.remove(); V87.tela = null; V87.frame = null; V87.rota = ''; } }
window.addEventListener('message', ev => {                // a página do painel pede para voltar ao jogo (o "jogar" de lá)
  if (!V87.frame || ev.source !== V87.frame.contentWindow) return;
  const d = ev.data;
  if (d && d.racha === 'site_fechar') v87FechaSite();
});
// Ajustes › Conta: quem é da equipe (o cargo vem do servidor) ganha o RACHA CONTROL — o painel administrativo, com o login
// e o 2FA dele, abre na página inteira (o "Jogar" de lá volta para cá)
const c82PintaContaAntes87 = c82PintaConta;
c82PintaConta = function(){
  const r = c82PintaContaAntes87.apply(this, arguments);
  try {
    const el = C82.cardEl, R = window.RACHA84;
    if (el && R && !R.embutido && C82.conta && R.eu && R.eu.cargo && !el.querySelector('.v87-admin')){
      const b = novoBotao('lb-btn v87-admin'); b.textContent = 'RACHA CONTROL';
      b.addEventListener('click', () => { som.clique(); location.href = R.base() + '/admin'; });
      el.appendChild(b);
    }
  } catch (_) {}
  return r;
};
// depois do login pelo jogo: a conta completa (o login devolve só o cartão público; o XP, a patente e o cargo vêm do auth.eu)
const v84EntrouAntes87 = v84Entrou;
v84Entrou = function(res){
  const r = v84EntrouAntes87.apply(this, arguments);
  try {
    const R = window.RACHA84;
    R.api('auth.eu', undefined, true).then(x => { if (x && x.logado && x.conta && R.logado()) R.entrou({ conta: x.conta }); }).catch(() => {});
  } catch (_) {}
  return r;
};
// v87.2: o presente de teste na produção (o texto da demonstração diz que ele não existe no lançamento)
const popPresenteAntes87 = popPresente;
popPresente = function(p){
  popPresenteAntes87(p);
  if (window.RACHA_MODO !== 'demo'){ const t = LB.popCaixa && LB.popCaixa.querySelector('.pop-txt'); if (t) t.textContent = 'Presente de teste: moedas e gemas para experimentar a loja à vontade.'; }
};
