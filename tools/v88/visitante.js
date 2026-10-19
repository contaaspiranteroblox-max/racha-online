/* ================================================================ v88.2: JOGAR ONLINE SEM CONTA (só o nome)
   A pedido: "a sala funcionar online sem criar conta, só botando o nome de usuário". Na tela de entrada do jogo, em cima de
   tudo: SEU NOME NO JOGO e o botão JOGAR ONLINE — o jogo guarda o nome (o mesmo do perfil: até 12 letras, com o filtro do
   chat), fecha a tela e abre as SALAS (a GALERA), que já conectam no servidor das salas. Sem conta dá para criar sala, entrar
   pelo código, o JOGAR AGORA, jogar a partida, o chat da sala e o Chat do Brasil: o servidor das salas aceita visitante (o
   site de teste do Render, com RACHA_VISITANTES=1, e a plataforma desde a v88.2 — a não ser que ela tenha RACHA_VISITANTES=0).
   O que é da conta (o progresso salvo na conta, a patente, os amigos, o correio, a loja da conta) continua pedindo a conta.
   Sem a plataforma de contas neste endereço (o Render, o GitHub Pages: as rotas da conta respondem 404), a tela mostra só o
   JOGAR ONLINE e o SÓ TREINAR OFFLINE — as abas ENTRAR e RECUPERAR não funcionariam ali.
   A física, as regras e as salas não mudam: é só a porta de entrada. */
const V882 = {css:false};
function v882Css(){
  if (V882.css || document.getElementById('v882css')) return;
  V882.css = true;
  const s = document.createElement('style'); s.id = 'v882css';
  s.textContent = `
#v84auth .v882-visit{background:#0f1a10;border:1px solid #2f6b3a;border-radius:14px;padding:14px 14px 10px;margin:0 0 16px}
#v84auth .v882-visit .v882-tit{display:block;font-size:13px;font-weight:900;letter-spacing:.08em;color:#7ee08f;margin-bottom:10px}
#v84auth .v882-go{width:100%;border:0;border-radius:12px;background:#2fb34a;color:#06200c;font-weight:900;font-size:16px;letter-spacing:.06em;padding:14px;cursor:pointer;margin-top:6px}
#v84auth .v882-go:disabled{opacity:.55}
#v84auth .v882-ou{display:flex;align-items:center;gap:10px;color:#7d7468;font-size:11px;font-weight:800;letter-spacing:.1em;margin:0 0 14px}
#v84auth .v882-ou::before,#v84auth .v882-ou::after{content:'';flex:1;height:1px;background:#2c2721}`;
  document.head.appendChild(s);
}
function v882NomeGuardado(){ return perfil.nome && perfil.nome !== 'Jogador' ? perfil.nome : ''; }
// a caixa do JOGAR ONLINE (o nome e o botão)
function v882Caixa(){
  v882Css();
  const box = v84El('div', 'v882-visit');
  box.appendChild(v84El('b', 'v882-tit', 'JOGAR ONLINE SEM CONTA'));
  const f = document.createElement('form'); f.noValidate = true;
  const lb = v84El('label', 'v84-cp'); lb.appendChild(v84El('span', null, 'Seu nome no jogo'));
  const inp = document.createElement('input'); inp.type = 'text'; inp.maxLength = 12; inp.autocomplete = 'nickname';
  inp.placeholder = 'ex.: Kauã10'; inp.value = v882NomeGuardado(); inp.className = 'v882-nome';
  lb.appendChild(inp);
  const er = v84El('div', 'v84-erro'); er.hidden = true;
  const go = v84El('button', 'v882-go', 'JOGAR ONLINE'); go.type = 'submit';   // (classe própria: o .v84-go continua sendo só o botão da conta)
  f.append(lb, er, go);
  f.addEventListener('submit', ev => { ev.preventDefault(); v882Joga(inp.value, er); });
  box.append(f, v84El('p', 'v84-nota', 'Sem conta: as salas, o JOGAR AGORA e o chat. A patente, o progresso salvo na conta e os amigos são da conta.'));
  return box;
}
function v882Joga(txt, er){
  const n = limpaNome(String(txt || '').replace(/\s+/g, ' '));
  const falha = m => { er.textContent = m; er.hidden = false; };
  if (Array.from(n).length < 2) return falha('Escreva um nome de 2 a 12 letras.');
  if (/^jogador$/i.test(n)) return falha('Escolha um nome seu (o "Jogador" é o nome de quem ainda não escolheu).');
  if (brasilAvisoCliente(n)) return falha('Escolha outro nome (sem palavrão, link, @, telefone ou e-mail).');
  try { som.clique(); } catch (_) {}
  perfil.nome = n; perfilSalvar();
  try { CONTA.onb = true; contaSalvar(); } catch (_) {}                // (a primeira vez pedia o nome: já foi)
  try { localStorage.setItem('racha-882-visitante', '1'); } catch (_) {}
  v84Fecha();
  try { const o = document.getElementById('onb'); if (o) o.hidden = true; } catch (_) {}
  try { if (!lobby.aberto) abrirLobby(); } catch (_) {}
  abreTela('amigos');                                                    // as SALAS (a GALERA): abrir já conecta no servidor das salas
  if (NET49.id) { try { v70Perfil(); } catch (_) {} }                    // (já estava conectado: o nome novo vai para o servidor)
  else if (!servidorEndereco()) x49Toast('Este jogo não sabe o endereço do servidor das salas: Ajustes › Avançado › Servidor.');
  try { lbRender(); } catch (_) {}
  setTimeout(() => { try { x49Toast('Jogando como ' + n + ' (sem conta)'); } catch (_) {} }, 300);
}
// a tela de entrada com a caixa em cima (e, sem a plataforma de contas aqui, só ela e o SÓ TREINAR OFFLINE)
function v882Arruma(){
  const box = V84.caixa; if (!box) return;
  const R = window.RACHA84;
  if (R && typeof R.logado === 'function' && R.logado()) return;
  if (!box.querySelector('.v882-visit')){
    const cx = v882Caixa();
    box.insertBefore(cx, box.firstChild);
    if (!V881.semPlataforma && box.querySelector('.v84-abas')) cx.after(v84El('div', 'v882-ou', 'OU ENTRE NA SUA CONTA'));
  }
  if (V881.semPlataforma){
    for (const el of [...box.children]){
      if (el.classList.contains('v882-visit')) continue;
      if (el.matches('.v84-alt') && /TREINAR OFFLINE/.test(el.textContent || '')) continue;   // (o SÓ TREINAR OFFLINE fica)
      if (el.matches('p.v84-nota') && el.nextElementSibling && el.nextElementSibling.matches('.v84-alt')) { el.hidden = true; continue; }
      el.hidden = true;                                                  // as abas e o formulário da conta: aqui não há a plataforma
    }
  }
  // (a nota do SÓ TREINAR OFFLINE dizia que o online precisa da conta: agora não precisa)
  for (const p of box.querySelectorAll('p.v84-nota')) if (/O online, o chat e o ranking precisam da conta/.test(p.textContent || '')) p.textContent = 'Sem internet? Dá para treinar contra os bots neste aparelho.';
  let visitou = false; try { visitou = localStorage.getItem('racha-882-visitante') === '1'; } catch (_) {}
  const inp = box.querySelector('.v882-nome');
  if (inp && (V881.semPlataforma || visitou)) setTimeout(() => { try { inp.focus(); } catch (_) {} }, 150);
}
const v84FormAntes882 = v84Form;
v84Form = function(aba){
  const r = v84FormAntes882.apply(this, arguments);
  try { v882Arruma(); } catch (_) {}
  if (V881.cadastro === null && !V881.semPlataforma) v881PerguntaCadastro(() => { try { v882Arruma(); } catch (_) {} });
  return r;
};
const v84EstadoAntes882 = v84Estado;
v84Estado = function(qual){
  const r = v84EstadoAntes882.apply(this, arguments);
  // sem a plataforma configurada (o arquivo aberto direto) ou sem conexão com ela: o JOGAR ONLINE também (as salas podem estar
  // num servidor separado: Ajustes › Avançado › Servidor, ou o ?servidor= do link)
  if (qual === 'semplataforma' || qual === 'offline'){ try { v882Arruma(); } catch (_) {} }
  return r;
};
if (V84.caixa) { try { v882Arruma(); } catch (_) {} }
