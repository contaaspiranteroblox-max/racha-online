/* ================================================================ v88.1: AS CONTAS PELO DONO (o lado do jogo)
   · CADASTRO FECHADO (o padrão da plataforma: só o Dono cria contas, no RACHA CONTROL › Contas): o login do jogo (sem o site)
     não mostra a aba CRIAR CONTA — fica o aviso de que as contas novas saem do dono do RACHA; o CRIAR CONTA do Ajustes ›
     Conta some; os outros CRIAR CONTA do jogo (o perfil, o LOGIN OBRIGATÓRIO das salas) abrem o ENTRAR com o mesmo aviso
     (sem o site, pelo formulário daqui; dentro do site, a página /entrar dele esconde o "Criar conta").
     Quem diz se está aberto é a plataforma (auth.cadastro); sem resposta (a plataforma antiga, sem rede), o jogo mostra como
     antes — e a plataforma recusa com a explicação, se estiver fechado.
   · O MESMO NÚMERO, OUTRA CONTA: depois do ZERAR CONTAS os números voltam a ser usados (000002…). Se a conta que entrou tem o
     número de quem jogava antes neste aparelho mas nasceu em outra hora, o jogo abre de novo — e o começo (tools/v82/inicio.js,
     a troca da v88.1 no tools/v88/v88.py) tira do aparelho o que era da conta apagada antes de o jogo ler.
   A física, as regras e os outros menus não mudam. */
const V881 = {cadastro:null, perguntando:false, recarregando:false, esperando:[]};
function v881PerguntaCadastro(depois){                     // (uma pergunta por vez; quem chegar enquanto isso espera a mesma resposta)
  const R = window.RACHA84;
  if (depois) V881.esperando.push(depois);
  if (!R || typeof R.base !== 'function' || !R.base() || V881.perguntando) return;
  V881.perguntando = true;
  Promise.resolve().then(() => R.api('auth.cadastro', undefined, true))
    .then(r => { if (r && typeof r.aberto === 'boolean') V881.cadastro = r.aberto; })
    .catch(() => {})
    .then(() => {
      V881.perguntando = false;
      const l = V881.esperando.splice(0);
      for (const f of l){ try { f(); } catch (_) {} }
    });
}
function v881Aviso(){
  return v84El('p', 'v84-nota v881-fechado', 'Contas novas: quem cria é o dono do RACHA. Peça a sua — depois é só ENTRAR com o usuário e a senha que ele mandar.');
}
// o formulário que está na tela, conforme o cadastro: sem a aba CRIAR CONTA e com o aviso (no ENTRAR)
function v881ArrumaForm(){
  const box = V84.caixa; if (!box || V881.cadastro !== false) return;
  if (V84.aba === 'criar'){ v84Form('entrar'); return; }
  const abas = box.querySelector('.v84-abas'); if (!abas) return;
  for (const b of [...abas.querySelectorAll('button')]) if (b.textContent === 'CRIAR CONTA') b.remove();
  abas.style.gridTemplateColumns = '1fr 1fr';
  if (V84.aba === 'entrar' && !box.querySelector('.v881-fechado')) abas.after(v881Aviso());
}
const v84FormAntes881 = v84Form;
v84Form = function(aba){
  if (aba === 'criar' && V881.cadastro === false) aba = 'entrar';
  const r = v84FormAntes881.call(this, aba);
  try {
    if (V881.cadastro === false) v881ArrumaForm();
    else if (V881.cadastro === null) v881PerguntaCadastro(v881ArrumaForm);
  } catch (_) {}
  return r;
};
if (V84.caixa) v881PerguntaCadastro(v881ArrumaForm);       // (o formulário já está na tela)

// (os outros CRIAR CONTA do jogo não precisam de troca: sem o site eles abrem este mesmo formulário — o v84Form acima
// leva ao ENTRAR com o aviso —, e dentro do site abrem o /entrar dele, que esconde o "Criar conta" sozinho)
// Ajustes › Conta (sem conta): com o cadastro fechado, o CRIAR CONTA some (fica o ENTRAR)
const c82PintaContaAntes881 = c82PintaConta;
c82PintaConta = function(){
  const r = c82PintaContaAntes881.apply(this, arguments);
  try {
    const cr = C82.cardEl && C82.cardEl.querySelector('.c82-criar');
    if (cr){
      if (V881.cadastro === false) cr.hidden = true;
      else if (V881.cadastro === null) v881PerguntaCadastro(() => { if (V881.cadastro === false && cr.isConnected) cr.hidden = true; });
    }
  } catch (_) {}
  return r;
};

// o mesmo número, outra conta: abre o jogo de novo (o começo tira o que era da conta apagada)
(function(){
  const R = window.RACHA84;
  if (!R || R.v881 || typeof R.entrou !== 'function') return;
  R.v881 = true;
  const entrouAntes = R.entrou;
  R.entrou = function(res){
    const r = entrouAntes.apply(this, arguments);
    try {
      const c = res && res.conta;
      if (c && c.idPublico && !V881.recarregando && R82.conta){
        const dono = 'c' + String(Number(c.idPublico)), nasc = Date.parse(c.criadoEm || '') || 0, antes = +R82.conta.nasc || 0;
        if (dono === R82.dono && nasc && antes && nasc !== antes){
          V881.recarregando = true;
          try { if (res.codigoRecuperacao) sessionStorage.setItem('racha-84-codigo', res.codigoRecuperacao); } catch (_) {}
          location.reload();
        }
      }
    } catch (_) {}
    return r;
  };
})();
