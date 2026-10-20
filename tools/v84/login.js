/* ================================================================ v84: LOGIN OBRIGATÓRIO (o jogo sem o site)
   O fluxo: ABRIR → VERIFICAR SESSÃO → LOGIN/CADASTRO → CARREGAR CONTA → MENU. Sem conta válida as salas, as
   partidas com conta, o chat, a loja da conta e o perfil da conta não abrem; o treino offline segue livre.
   v85: o SÓ TREINAR OFFLINE aparece também no formulário de login e no SEM CONEXÃO (na v84 ele só existia quando o
   jogo não sabia o endereço da plataforma: com a plataforma configurada e fora do ar — ou servido pelo server/servidor.js,
   que não tem as rotas de conta — a tela de login não tinha saída e nem o treino abria).
   Com o site (iframe) este módulo não aparece: quem pede login é o site. A senha NUNCA vai para o
   armazenamento comum — só o token da sessão (e a conta em cache, sem segredos). */
V70C_LISTA.splice(1, 0, {q:'#v84auth', fecha:null, modal:true, foco:'input, button'});   // na pilha de modais do v70 (senão o overlay fica inerte)
const V84 = {tela:null, caixa:null, aba:'entrar'};
const V84P = {aberta:null};                                 // a partida aberta na conta (matchId + a promessa do matchToken)
function v84Css(){
  if (document.getElementById('v84css')) return;
  const s = document.createElement('style'); s.id = 'v84css';
  s.textContent = `
#v84auth{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;background:radial-gradient(120% 100% at 50% 0%, #1d1a16 0%, #0d0c0a 55%, #060605 100%);overflow:auto}
#v84auth .v84-card{width:100%;max-width:420px;margin:auto;background:#141210;border:1px solid #2c2721;border-radius:18px;padding:22px 20px;color:#f0e9df;box-shadow:0 24px 70px rgba(0,0,0,.6)}
#v84auth .v84-logo{text-align:center;font-size:52px;font-weight:900;letter-spacing:.14em;color:#FF6A00;text-shadow:0 0 26px rgba(255,106,0,.35);line-height:1}
#v84auth .v84-sub{text-align:center;color:#a89f92;font-size:13px;margin:8px 0 18px}
#v84auth .v84-abas{display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;background:#0c0b09;border:1px solid #2c2721;border-radius:12px;padding:4px;margin-bottom:16px}
#v84auth .v84-abas button{border:0;border-radius:9px;padding:10px 6px;font-weight:800;font-size:12px;letter-spacing:.04em;background:transparent;color:#b7aea0;cursor:pointer}
#v84auth .v84-abas button.at{background:#FF6A00;color:#140b00}
#v84auth label.v84-cp{display:block;margin-bottom:12px}
#v84auth label.v84-cp>span{display:block;font-size:11px;font-weight:800;letter-spacing:.08em;color:#a89f92;margin-bottom:5px;text-transform:uppercase}
#v84auth input[type=text],#v84auth input[type=email],#v84auth input[type=password]{width:100%;box-sizing:border-box;background:#0c0b09;border:1px solid #35302a;border-radius:10px;color:#f0e9df;padding:12px;font-size:16px;outline:none}
#v84auth input:focus{border-color:#FF6A00}
#v84auth .v84-senha{position:relative}
#v84auth .v84-senha button{position:absolute;right:6px;top:50%;transform:translateY(-50%);background:transparent;border:0;font-size:17px;cursor:pointer;padding:6px;color:#a89f92}
#v84auth .v84-go{width:100%;border:0;border-radius:12px;background:#FF6A00;color:#140b00;font-weight:900;font-size:16px;letter-spacing:.06em;padding:14px;cursor:pointer;margin-top:6px}
#v84auth .v84-go:disabled{opacity:.55}
#v84auth .v84-erro{background:#3b1414;color:#ffb3a7;border-radius:10px;padding:10px 12px;font-size:13px;margin:10px 0}
#v84auth .v84-okm{background:#12321c;color:#9fe8b6;border-radius:10px;padding:10px 12px;font-size:13px;margin:10px 0}
#v84auth .v84-nota{color:#a89f92;font-size:12px;margin:8px 0;line-height:1.45}
#v84auth .v84-link{background:none;border:0;color:#FF6A00;font-weight:700;font-size:13px;cursor:pointer;padding:4px 0}
#v84auth .v84-termos{display:flex;gap:8px;align-items:flex-start;font-size:12px;color:#b7aea0;margin:4px 0 2px}
#v84auth .v84-termos input{width:18px;height:18px;accent-color:#FF6A00;margin-top:1px;flex:none}
#v84auth .v84-cod{background:#0c0b09;border:1px dashed #FF6A00;border-radius:12px;text-align:center;font-family:monospace;font-size:20px;font-weight:700;letter-spacing:.18em;color:#FF6A00;padding:16px 8px;margin:12px 0;user-select:all}
#v84auth .v84-ver{text-align:center;color:#a89f92;font-size:15px;padding:24px 0}
#v84auth .v84-ver b{color:#FF6A00;display:block;font-size:19px;margin-bottom:8px;letter-spacing:.08em}
#v84auth .v84-alt{width:100%;border:1px solid #35302a;border-radius:12px;background:transparent;color:#f0e9df;font-weight:800;font-size:14px;padding:12px;cursor:pointer;margin-top:8px}`;
  document.head.appendChild(s);
}
function v84El(tag, cls, txt){ const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
function v84Monta(){
  v84Css();
  if (V84.tela) return;
  const t = v84El('div'); t.id = 'v84auth'; t.setAttribute('role', 'dialog'); t.setAttribute('aria-modal', 'true');
  const c = v84El('div', 'v84-card');
  c.appendChild(v84El('div', 'v84-logo', 'RACHA'));
  c.appendChild(v84El('p', 'v84-sub', 'O futebol de rua — entre na sua conta para jogar online, salvar o progresso e aparecer no ranking.'));
  V84.caixa = v84El('div');
  c.appendChild(V84.caixa); t.appendChild(c);
  document.body.appendChild(t); V84.tela = t;
}
function v84Fecha(){ if (V84.tela){ V84.tela.remove(); V84.tela = null; V84.caixa = null; } }
function v84AbreLogin(qual){
  const R = window.RACHA84; if (!R || R.embutido) return;
  if (R.logado()) return;
  v84Monta(); v84Form(qual === 'criar' ? 'criar' : qual === 'recuperar' ? 'recuperar' : 'entrar');
}
function v84CampoSenha(rotulo){
  const lb = v84El('label', 'v84-cp'), sp = v84El('span', null, rotulo), w = v84El('div', 'v84-senha');
  const inp = document.createElement('input'); inp.type = 'password'; inp.autocomplete = 'off';
  const b = v84El('button'); b.type = 'button'; b.textContent = '👁'; b.setAttribute('aria-label', 'Mostrar ou ocultar a senha');
  b.addEventListener('click', () => { const v = inp.type === 'text'; inp.type = v ? 'password' : 'text'; b.textContent = v ? '👁' : '🙈'; });
  w.append(inp, b); lb.append(sp, w);
  return { el: lb, input: inp };
}
function v84Form(aba){
  const R = window.RACHA84, box = V84.caixa; if (!box) return;
  V84.aba = aba; box.textContent = '';
  const abas = v84El('div', 'v84-abas');
  [['entrar', 'ENTRAR'], ['criar', 'CRIAR CONTA'], ['recuperar', 'RECUPERAR']].forEach(p => {
    const b = v84El('button', aba === p[0] ? 'at' : '', p[1]); b.type = 'button';
    b.addEventListener('click', () => { som.clique(); v84Form(p[0]); });
    abas.appendChild(b);
  });
  box.appendChild(abas);
  const erro = v84El('div', 'v84-erro'); erro.hidden = true;
  const okm = v84El('div', 'v84-okm'); okm.hidden = true;
  const falha = m => { erro.textContent = m; erro.hidden = !m; okm.hidden = true; };
  const form = document.createElement('form'); form.noValidate = true;

  if (aba === 'entrar'){
    const l1 = v84El('label', 'v84-cp'); l1.appendChild(v84El('span', null, 'E-mail ou usuário'));
    const ident = document.createElement('input'); ident.type = 'text'; ident.autocomplete = 'username'; l1.appendChild(ident);
    const cs = v84CampoSenha('Senha');
    const esq = v84El('button', 'v84-link', 'Esqueci minha senha'); esq.type = 'button';
    esq.addEventListener('click', () => v84Form('recuperar'));
    const go = v84El('button', 'v84-go', 'ENTRAR'); go.type = 'submit';
    form.append(l1, cs.el, esq, erro, go);
    form.addEventListener('submit', ev => {
      ev.preventDefault(); falha(''); go.disabled = true; go.textContent = 'ENTRANDO…';
      R.api('auth.entrar', { identificador: ident.value.trim(), senha: cs.input.value }).then(res => {
        if (res && res.conta) v84Entrou(res);
        else { falha('E-mail/usuário ou senha incorretos.'); go.disabled = false; go.textContent = 'ENTRAR'; }
      }).catch(e => { falha(e && e.message || 'Falha ao entrar.'); go.disabled = false; go.textContent = 'ENTRAR'; });
    });
  } else if (aba === 'criar'){
    function campo(rotulo, tipo){
      const lb = v84El('label', 'v84-cp'); lb.appendChild(v84El('span', null, rotulo));
      const i = document.createElement('input'); i.type = tipo || 'text'; lb.appendChild(i); return { el: lb, input: i };
    }
    const cUsu = campo('Nome de usuário (login)'), cNom = campo('Nome de exibição'), cEm = campo('E-mail (opcional)');
    cUsu.input.autocomplete = 'off'; cEm.input.type = 'email'; cEm.input.autocomplete = 'email';
    const cS1 = v84CampoSenha('Senha'), cS2 = v84CampoSenha('Confirmar senha');
    const nt1 = v84El('p', 'v84-nota', 'Usuário: 3 a 20 caracteres, letras minúsculas, números e _. Senha: mínimo 8, com letra e número.');
    const tm = v84El('label', 'v84-termos');
    const ck = document.createElement('input'); ck.type = 'checkbox';
    tm.append(ck, v84El('span', null, 'Li e aceito os termos de uso e a política de privacidade do RACHA.'));
    const go = v84El('button', 'v84-go', 'CRIAR CONTA'); go.type = 'submit';
    form.append(cUsu.el, cNom.el, cEm.el, cS1.el, cS2.el, nt1, tm, erro, go);
    form.addEventListener('submit', ev => {
      ev.preventDefault(); falha('');
      if (cS1.input.value !== cS2.input.value) return falha('As senhas não são iguais.');
      if (!ck.checked) return falha('É preciso aceitar os termos e a política de privacidade.');
      go.disabled = true; go.textContent = 'CRIANDO…';
      R.api('auth.registrar', {
        username: cUsu.input.value.trim(), nomeExibicao: cNom.input.value.trim(),
        senha: cS1.input.value, confirmacaoSenha: cS2.input.value,
        email: cEm.input.value.trim(), aceiteTermos: true
      }).then(res => {
        if (res && res.conta) v84Entrou(res);
        else { falha('Não foi possível criar a conta.'); go.disabled = false; go.textContent = 'CRIAR CONTA'; }
      }).catch(e => { falha(e && e.message || 'Falha ao criar a conta.'); go.disabled = false; go.textContent = 'CRIAR CONTA'; });
    });
  } else {
    const nt = v84El('p', 'v84-nota', 'Informe o e-mail da conta. Se ele estiver cadastrado, você recebe um link para redefinir a senha (vale por 1 hora).');
    const lb = v84El('label', 'v84-cp'); lb.appendChild(v84El('span', null, 'E-mail'));
    const em = document.createElement('input'); em.type = 'email'; em.autocomplete = 'email'; lb.appendChild(em);
    const go = v84El('button', 'v84-go', 'ENVIAR LINK'); go.type = 'submit';
    form.append(nt, lb, erro, okm, go);
    form.addEventListener('submit', ev => {
      ev.preventDefault(); falha(''); go.disabled = true; go.textContent = 'ENVIANDO…';
      R.api('auth.pedirRecuperacaoEmail', { email: em.value.trim() }).then(res => {
        okm.textContent = (res && res.mensagem) || 'Se esse e-mail estiver cadastrado, enviamos um link para redefinir a senha.';
        okm.hidden = false; go.disabled = true; go.textContent = 'LINK ENVIADO';
      }).catch(e => { falha(e && e.message || 'Falha ao pedir recuperação.'); go.disabled = false; go.textContent = 'ENVIAR LINK'; });
    });
  }
  box.appendChild(form);
  v84BotaoOffline(box);                                  // v85: sem conta, o treino offline continua livre
  const primeiro = form.querySelector('input');
  if (primeiro) setTimeout(() => { try { primeiro.focus(); } catch (_) {} }, 120);
}
// A conta entrou: guarda o token; se o dono do progresso deste aparelho é outro, reabre o jogo (o v82 troca as chaves na entrada)
function v84Entrou(res){
  const R = window.RACHA84;
  R.entrou(res);
  const dono = res.conta && res.conta.idPublico ? 'c' + String(Number(res.conta.idPublico)) : '';
  if (dono && dono !== R82.dono){
    try { if (res.codigoRecuperacao) sessionStorage.setItem('racha-84-codigo', res.codigoRecuperacao); } catch (_) {}
    location.reload();
    return;
  }
  if (res.codigoRecuperacao) v84Codigo(res.codigoRecuperacao);
  else { v84Fecha(); v84DepoisDoLogin(); }
}
function v84Codigo(codigo){
  const box = V84.caixa; if (!box) return;
  box.textContent = '';
  box.append(
    v84El('p', 'v84-nota', 'GUARDE SEU CÓDIGO DE RECUPERAÇÃO — ele aparece SOMENTE AGORA e substitui qualquer código anterior. Sem ele e sem acesso ao e-mail, a conta não pode ser recuperada.'),
    v84El('div', 'v84-cod', codigo));
  const cp = v84El('button', 'v84-alt', 'COPIAR CÓDIGO'); cp.type = 'button';
  cp.addEventListener('click', () => { try { navigator.clipboard && navigator.clipboard.writeText(codigo); } catch (_) {} cp.textContent = 'COPIADO ✓'; });
  const go = v84El('button', 'v84-go', 'JÁ ANOTEI — CONTINUAR'); go.type = 'button';
  go.addEventListener('click', () => { som.clique(); v84Fecha(); v84DepoisDoLogin(); });
  box.append(cp, go);
}
function v84BotaoOffline(box){                          // v85: o mesmo SÓ TREINAR OFFLINE da tela sem plataforma
  const nt = v84El('p', 'v84-nota', 'Sem conta dá para treinar contra os bots neste aparelho. O online, o chat e o ranking precisam da conta.');
  const b = v84El('button', 'v84-alt', 'SÓ TREINAR OFFLINE'); b.type = 'button';
  b.addEventListener('click', () => { som.clique(); v84Fecha(); });
  box.append(nt, b);
}
function v84Estado(qual){
  const box = V84.caixa; if (!box) return;
  box.textContent = '';
  if (qual === 'verificando'){
    const v = v84El('div', 'v84-ver'); v.append(v84El('b', null, 'VERIFICANDO SUA SESSÃO…'), v84El('span', null, 'Um momento.'));
    box.appendChild(v); return;
  }
  if (qual === 'offline'){
    const v = v84El('div', 'v84-ver'); v.append(v84El('b', null, 'SEM CONEXÃO'), v84El('span', null, 'Não deu para falar com a plataforma. Confira a internet e tente de novo.'));
    const b = v84El('button', 'v84-go', 'TENTAR DE NOVO'); b.type = 'button';
    b.addEventListener('click', () => location.reload());
    box.append(v, b); v84BotaoOffline(box); return;     // v85: sem a plataforma, o treino offline continua livre
  }
  const v = v84El('div', 'v84-ver');
  v.append(v84El('b', null, 'PLATAFORMA NÃO CONFIGURADA'),
    v84El('span', null, 'Este jogo não sabe o endereço da plataforma (o "plataforma" do config.js). Sem ela não há conta — e o online precisa de conta.'));
  const b = v84El('button', 'v84-alt', 'SÓ TREINAR OFFLINE'); b.type = 'button';
  b.addEventListener('click', () => { som.clique(); v84Fecha(); });
  box.append(v, b);
}
function v84Inicia(){
  const R = window.RACHA84;
  if (!R || R.embutido) return;                          // dentro do site: quem pede o login é o site
  if (!R.base()){ v84Monta(); v84Estado('semplataforma'); return; }
  if (R.eu && R.token){
    v84Monta(); v84Estado('verificando');
    R.api('auth.eu', undefined, true).then(res => {
      if (res && res.logado && res.conta){
        R.entrou({ conta: res.conta });
        if ('c' + String(Number(res.conta.idPublico)) !== R82.dono){ location.reload(); return; }
        v84Fecha(); v84DepoisDoLogin();
      } else { R.saiu(); v84Form('entrar'); }
    }).catch(e => {
      if (e && e.status === 401){ R.saiu(); v84Form('entrar'); }
      else v84Estado(e && e.status === 404 ? 'semplataforma' : 'offline');
    });
    return;
  }
  v84Monta(); v84Form('entrar');
}
// depois do login: o RACHA_EVT (a ponte dos eventos) chega com o racha-bridge.js — espera e engancha
function v84DepoisDoLogin(){
  let n = 0;
  const t = setInterval(() => {
    if (window.RACHA_EVT){ clearInterval(t); v84GanchaEvt(); }
    else if (++n > 40) clearInterval(t);
  }, 250);
}
// os eventos da partida vão para a conta por HTTP (o mesmo que o site faz pelo postMessage)
function v84GanchaEvt(){
  const ev = window.RACHA_EVT, R = window.RACHA84;
  if (!ev || ev.v84) return;
  const ini = ev.inicio, fim = ev.fim, tre = ev.treino;
  ev.inicio = function(d){
    try { if (ini) ini(d); } catch (_) {}
    if (!R.logado()) return;
    const matchId = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'm' + Date.now() + '-' + Math.random().toString(36).slice(2);
    const token = R.api('jogo.iniciarPartida', {
      matchId, modo: String(d && d.modo || 'futebol'), mapa: d && d.mapa ? String(d.mapa) : undefined,
      nivelBots: ['facil', 'medio', 'dificil', 'lenda'].includes(String(d && d.nivelBots)) ? String(d.nivelBots) : undefined,
      ranqueada: !!(d && d.ranqueada), online: !!(d && d.online),
      tamanho: [1, 2, 3, 4].includes(Number(d && d.tamanho)) ? Number(d.tamanho) : undefined
    }).then(r => {
      if (r && r.desistencias) R.avisa({ tipo: 'desistencia', n: r.desistencias, rq: r.rq });
      return r && r.matchToken ? r.matchToken : null;
    }).catch(() => null);
    V84P.aberta = { matchId, token };
  };
  ev.fim = function(d){
    try { if (fim) fim(d); } catch (_) {}
    if (!R.logado()) return;
    const ab = V84P.aberta; V84P.aberta = null;
    if (!ab) return;                                     // fim sem começo: ignora com honestidade
    Promise.resolve(ab.token).then(matchToken => {
      if (!matchToken){ R.avisa({ tipo: 'resultado', resultado: null, erro: 'A partida não foi aberta na conta (sem conexão no começo).' }); return; }
      return R.api('jogo.encerrarPartida', {
        matchId: ab.matchId, matchToken,
        placarNosso: Number(d.placarNosso) || 0, placarDeles: Number(d.placarDeles) || 0,
        gols: Number(d.gols) || 0, assistencias: Number(d.assistencias) || 0, golsGinga: Number(d.golsGinga) || 0,
        duracaoSeg: Number(d.duracaoSeg) || 0, abandonada: !!d.abandonada,
        modo: typeof d.modo === 'string' ? d.modo : undefined,
        pontos: Number(d.pontos) || 0, golsContra: Number(d.golsContra) || 0,
        online: !!d.online, valida: d.valida !== false,
        selo: typeof d.selo === 'string' && d.selo ? d.selo : undefined
      }).then(r => { R.avisa({ tipo: 'resultado', resultado: r }); });
    }).catch(e => { R.avisa({ tipo: 'resultado', resultado: null, erro: e && e.message ? e.message : 'sem conexão' }); });
  };
  ev.treino = function(tipo){
    try { if (tre) tre(tipo); } catch (_) {}
    if (!R.logado()) return;
    R.api('jogo.golTreino', { quantidade: 1, origem: tipo === 'treino' ? 'treino' : 'livre' }).catch(() => {});
  };
  ev.v84 = true;
}
// SAIR DA CONTA (Ajustes › Conta): revoga a sessão no servidor; o progresso do jogador NÃO é apagado
function v84Sair(){
  const R = window.RACHA84; if (!R) return;
  Promise.resolve(R.api('auth.sair', {})).catch(() => {}).then(() => {
    R.saiu();
    try { sessionStorage.removeItem('racha-84-codigo'); } catch (_) {}
    location.reload();
  });
}
// o cartão da conta (Ajustes › Conta) ganha o SAIR DA CONTA quando o jogo está sem o site
const c82PintaContaAntes84 = c82PintaConta;
c82PintaConta = function(){
  const r = c82PintaContaAntes84.apply(this, arguments);
  try {
    const el = C82.cardEl, R = window.RACHA84;
    if (el && R && !R.embutido && C82.conta && !el.querySelector('.v84-sair')){
      const b = novoBotao('lb-btn v84-sair'); b.textContent = 'SAIR DA CONTA';
      b.addEventListener('click', () => { som.clique(); v84Sair(); });
      el.appendChild(b);
    }
  } catch (_) {}
  return r;
};
// o código de recuperação de quem acabou de entrar (guardado antes do jogo reabrir para trocar de dono)
try {
  const cod84 = sessionStorage.getItem('racha-84-codigo');
  if (cod84 && window.RACHA84 && !window.RACHA84.embutido){
    sessionStorage.removeItem('racha-84-codigo');
    setTimeout(() => { v84Monta(); v84Codigo(cod84); }, 400);
  }
} catch (_) {}

