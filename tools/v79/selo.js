/* ======================================================================================================================
   RACHA rua v79 · O SELO V (o pedido: "crie esse V ali, que será para influenciadores — essa imagem é só um exemplo")
   O V na frente do nome: um emblema de seis lados com o V no meio, desenho próprio (o mesmo da plataforma, SeloV em
   app/src/lib/racha.tsx), na cor de cada selo da conta: VERIFICADO dourado (os influenciadores), PARCEIRO prata, EQUIPE
   vermelho e CRIADOR laranja. Quem dá e tira é só o dono, no RACHA CONTROL da plataforma (gerenciar_selos).
   De onde vem (e por que ninguém se dá um selo pelo jogo):
   · o SEU: da sua conta na plataforma (RACHA_JOGO.conta().selos) ou, conectado no servidor da turma, do hello (o servidor
     tira da sessão do site ou do bilhete assinado pela plataforma);
   · o dos OUTROS: do servidor da turma (os membros da sala, a lista das salas e o Chat do Brasil trazem o selo de cada um,
     que o servidor tirou da conta — o que o jogo de alguém mandar não conta).
   Onde aparece: no lobby (o seu cartão), no perfil, na partida (embaixo da tampinha, antes do nome), na apresentação dos
   times, nos cartões da sala, na lista das salas (o dono) e nos chats (a sala e o Brasil). Cosmético: não muda nada no jogo.
   ====================================================================================================================== */
const V79_SELOS = ['equipe', 'criador', 'verificado', 'parceiro'];   // (a ordem do servidor: vale o primeiro que a conta tiver)
const V79_SELO = {
  verificado:{nome:'VERIFICADO', desc:'Verificado RACHA (influenciador)', cor:['#fff3b0', '#ffc928', '#a86a00']},
  parceiro:  {nome:'PARCEIRO',   desc:'Parceiro RACHA',                   cor:['#ffffff', '#c3ccd8', '#5d6b82']},
  equipe:    {nome:'EQUIPE',     desc:'Equipe RACHA',                     cor:['#ffc2b8', '#ff3b30', '#8c1010']},
  criador:   {nome:'CRIADOR',    desc:'Criador do RACHA',                 cor:['#ffe0bd', '#ff8a2a', '#9a4300']}
};
const V79S_D = {fora:'M12 .8l10.2 5.9v11.8L12 24.4 1.8 18.5V6.7z', meio:'M12 2.3l8.9 5.1v10.3L12 22.9l-8.9-5.2V7.4z',
  miolo:'M12 5.1l6.5 3.8v7.6L12 20.2l-6.5-3.7V8.9z', v:'M7.1 7.9h3.3l1.6 5.3 1.6-5.3h3.3l-3.4 9.3h-3z'};
const v79SeloOk = s => typeof s === 'string' && Object.prototype.hasOwnProperty.call(V79_SELO, s);
function v79SeloSvg(s, id){                                   // (id: o nome do degradê; num data: URI cada imagem tem o seu)
  const c = V79_SELO[s].cor; id = id || 'v79sg';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 25"><defs><linearGradient id="' + id + '" x1="0" y1="0" x2=".35" y2="1">'
    + '<stop offset="0" stop-color="' + c[0] + '"/><stop offset=".5" stop-color="' + c[1] + '"/><stop offset="1" stop-color="' + c[2] + '"/></linearGradient></defs>'
    + '<path d="' + V79S_D.fora + '" fill="#111"/><path d="' + V79S_D.meio + '" fill="url(#' + id + ')"/>'
    + '<path d="' + V79S_D.miolo + '" fill="#15110a" opacity=".82"/>'
    + '<path d="' + V79S_D.v + '" fill="url(#' + id + ')" stroke="#111" stroke-width=".9" stroke-linejoin="round"/></svg>';
}
(function v79SeloCss(){                                       // o V no DOM: [data-v79-selo="…"]::before (o v79.css dá o tamanho e o lugar)
  try {
    const st = document.createElement('style'); st.id = 'v79-selo-css';
    st.textContent = Object.keys(V79_SELO).map(s => '[data-v79-selo="' + s + '"]::before{background-image:url("data:image/svg+xml,' + encodeURIComponent(v79SeloSvg(s)) + '")}').join('\n');
    document.head.appendChild(st);
  } catch (_) {}
})();
function v79SeloMarca(el, s){                                 // põe (ou tira) o V na frente do texto do elemento
  if (!el) return;
  s = v79SeloOk(s) ? s : '';
  if ((el.dataset.v79Selo || '') === s) return;
  if (s){ el.dataset.v79Selo = s; el.setAttribute('title', V79_SELO[s].desc); }
  else { delete el.dataset.v79Selo; if (el.getAttribute('title') && /RACHA/.test(el.getAttribute('title'))) el.removeAttribute('title'); }
}

/* ---- o seu selo ---- */
function v79SeloEu(){
  try { const c = pxConta(); if (c && Array.isArray(c.selos)){ const s = V79_SELOS.find(x => c.selos.indexOf(x) >= 0); if (s) return s; } } catch (_) {}
  return v79SeloOk(NET49.selo) ? NET49.selo : '';
}
function v79SeloDoMembro(id){ const r = NET49.room, m = r && Array.isArray(r.members) ? r.members.find(x => x && x.id === id) : null; return m && v79SeloOk(m.selo) ? m.selo : ''; }
function v79SeloSync(){                                       // o lobby e o perfil (o seu nome)
  const s = v79SeloEu();
  for (const id of ['lb-eu-nome', 'rx-nome', 'lb-nome-txt', 'lb-placa-nome']) v79SeloMarca(document.getElementById(id), s);
}
const v77LbSyncAntes79s = v77LbSync;
v77LbSync = function(){ const r = v77LbSyncAntes79s.apply(this, arguments); try { v79SeloSync(); } catch (_) {} return r; };
setInterval(() => { try { if (lobby.aberto) v79SeloSync(); } catch (_) {} }, 2000);   // (a conta da plataforma chega depois do jogo abrir)

/* ---- na partida: o V desenhado antes do nome (o seu e o de quem está na sala online) ---- */
const V79S_IMG = new Map();
function v79SeloImg(s, px){                                   // o emblema pronto numa imagem (desenhar caminho por caminho a cada quadro custa mais)
  const k = s + '|' + px; let c = V79S_IMG.get(k); if (c) return c;
  c = document.createElement('canvas'); c.width = c.height = px;
  const g = c.getContext('2d'), cor = V79_SELO[s].cor, e = px/25;
  g.scale(e, e); g.translate(.5, 0);
  const gr = g.createLinearGradient(0, 0, 8.4, 25); gr.addColorStop(0, cor[0]); gr.addColorStop(.5, cor[1]); gr.addColorStop(1, cor[2]);
  try {
    g.fillStyle = '#111'; g.fill(new Path2D(V79S_D.fora));
    g.fillStyle = gr; g.fill(new Path2D(V79S_D.meio));
    g.globalAlpha = .82; g.fillStyle = '#15110a'; g.fill(new Path2D(V79S_D.miolo)); g.globalAlpha = 1;
    const v = new Path2D(V79S_D.v); g.fillStyle = gr; g.fill(v); g.lineWidth = .9; g.strokeStyle = '#111'; g.lineJoin = 'round'; g.stroke(v);
  } catch (_) {}
  V79S_IMG.set(k, c);
  return c;
}
function v79SeloDesenha(g, cx, cy, tam, s){ if (!v79SeloOk(s)) return; g.drawImage(v79SeloImg(s, Math.max(16, Math.ceil(tam*2))), cx - tam/2, cy - tam/2, tam, tam); }
const drawPlayerAntes79 = drawPlayer;
drawPlayer = function(g, x, y, r, sk, nome, av, semSombra, est){
  const v = drawPlayerAntes79.apply(this, arguments);
  try {
    if (nome){
      const s = NET49.playing ? P.netSelo : v79SeloEu(), nm = NET49.playing ? P.nome : nome;
      if (v79SeloOk(s)) v79SeloDesenha(g, x - medeTxt(nm, '20px ' + FONT)/2 - 15, y + r + 25, 22, s);
    }
  } catch (_) {}
  return v;
};
const rqDesenhaJogAntes79 = rqDesenhaJog;
rqDesenhaJog = function(g){
  const v = rqDesenhaJogAntes79.apply(this, arguments);
  try {
    if (NET49.playing){
      const a = VIS.a == null ? 1 : VIS.a;
      for (const q of RQ.jog){
        if (q === P || !v79SeloOk(q.netSelo)) continue;
        const x = q.ax + (q.x - q.ax)*a + (q.ex || 0), y = q.ay + (q.y - q.ay)*a + (q.ey || 0);
        v79SeloDesenha(g, x - medeTxt(q.nome, '20px ' + FONT)/2 - 15, y + q.r + 28, 22, q.netSelo);
      }
    }
  } catch (_) {}
  return v;
};
const net49BeginAntes79s = net49Begin;
net49Begin = function(room){
  const r = net49BeginAntes79s.apply(this, arguments);
  try { if (NET49.playing && room && Array.isArray(room.members)) for (const q of RQ.jog) q.netSelo = q.netId ? v79SeloDoMembro(q.netId) : ''; } catch (_) {}
  return r;
};
const net49MessageAntes79s = net49Message;
net49Message = function(m){
  if (m && m.type === 'hello') NET49.selo = v79SeloOk(m.selo) ? m.selo : '';
  const r = net49MessageAntes79s.apply(this, arguments);
  if (m && m.type === 'hello') try { v79SeloSync(); } catch (_) {}
  return r;
};
const rqVsAbreAntes79s = rqVsAbre;
rqVsAbre = function(){                                        // a apresentação dos times: o seu nome com o V
  const r = rqVsAbreAntes79s.apply(this, arguments);
  try { const s = v79SeloEu(); for (const b of document.querySelectorAll('#rq-vs li.eu > b')) v79SeloMarca(b, s); } catch (_) {}
  return r;
};

/* ---- as salas e os chats: o V de cada um (do servidor) ---- */
const slCartaoAntes79 = slCartao;
slCartao = function(m, r){
  const d = slCartaoAntes79.apply(this, arguments);
  try { if (d && m) v79SeloMarca(d.querySelector('.sl-nm-t'), m.selo); } catch (_) {}
  return d;
};
const sxLinhaAntes79 = sxLinha;
sxLinha = function(s){                                        // a lista das salas: o V do dono na frente do nome da sala
  const d = sxLinhaAntes79.apply(this, arguments);
  try { if (d && s) v79SeloMarca(d.querySelector('.sx-nm > span'), s.selo); } catch (_) {}
  return d;
};
const cbPintaPainelAntes79 = cbPintaPainel;
cbPintaPainel = function(){                                   // o chat de baixo (a sala ou o Brasil): as linhas são as mesmas mensagens, na mesma ordem
  const r = cbPintaPainelAntes79.apply(this, arguments);
  try {
    if (CB.aberto && CB.lista){
      const sala = CB.aba === 'sala';
      const L = sala ? SL.chat.slice(-30).reverse().filter(m => m && !m.sys) : BRASIL.msgs.filter(m => m && !BRASIL.silenciados.has(m.from)).slice(-30).reverse();
      const linhas = Array.from(CB.lista.children).filter(d => !d.classList.contains('sys'));
      linhas.forEach((d, i) => { const m = L[i]; if (m) v79SeloMarca(d.querySelector('b'), sala ? (m.id === NET49.id ? v79SeloEu() : v79SeloDoMembro(m.id)) : m.selo); });
    }
  } catch (_) {}
  return r;
};
const brasilRenderListaAntes79 = brasilRenderLista;
brasilRenderLista = function(tudo){                           // o CHAT DO BRASIL (a tela inteira)
  const r = brasilRenderListaAntes79.apply(this, arguments);
  try {
    const lista = document.getElementById('br-lista');
    if (lista){
      const L = BRASIL.msgs.filter(m => m && !BRASIL.silenciados.has(m.from));
      lista.querySelectorAll('.br-msg').forEach((d, i) => { const m = L[i]; if (m) v79SeloMarca(d.querySelector('.br-nome'), m.selo); });
    }
  } catch (_) {}
  return r;
};
try { v79SeloSync(); } catch (_) {}
window.RachaSelo79 = {selos:V79_SELO, eu:() => v79SeloEu(), svg:s => v79SeloOk(s) ? v79SeloSvg(s) : ''};
