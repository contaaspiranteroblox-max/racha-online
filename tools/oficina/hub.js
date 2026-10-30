/* =====================================================================================================================
   RACHA v92 · OFICINA — A CENTRAL (tools/oficina/hub.js)
   A tela de entrada da Oficina: criar um mapa (do zero ou de um dos 15 modelos), os mapas do aparelho (meus e em
   desenvolvimento), a comunidade (populares, recentes, curtidos, categorias, escolha da comunidade, as salas abertas
   com mapa), favoritos, oficiais, compartilhados comigo e a busca por nome ou código. E as janelas do mapa: detalhes
   (jogar, testar, curtir, favoritar, duplicar, editar, versões, denunciar), publicar, configurar, colaboradores e a
   moderação (só a equipe). O caminho de um mapa é um só: EDITAR, SALVAR (no aparelho) e PUBLICAR (no servidor) — sem
   arquivo para baixar ou importar. Cada jogador tem até 3 mapas PÚBLICOS (os da comunidade, com as curtidas e os
   favoritos); os não listados e os privados não contam. JOGAR abre a janela CRIAR SALA (sala.js), com a física da sala.
   ===================================================================================================================== */
const HUB = { aba: 'meus', sub: 'populares', busca: '', itens: [], pagina: 0, total: 0, gen: 0, eu: null, euT: 0, thumbs: new Map(), modo: 'racha', abaDe: { racha: 'meus', rachao: 'rachao' } };
// v98: os DOIS MODOS da Oficina, separados — RACHA (os mapas da Oficina) e RACHÃO (os estádios e as salas online do Rachão).
// Cada aba é de um modo; a escolha do modo fica no topo da central (e no CRIAR) e fica guardada no aparelho.
const MODOS_OFI = ['racha', 'rachao'];
const MODO_OFI_CHAVE = 'racha-ofi-modo';
try { if (localStorage.getItem(MODO_OFI_CHAVE) === 'rachao') HUB.modo = 'rachao'; } catch (_) {}
const ABAS_HUB = [['meus', 'pasta', 'Meus mapas', 'racha'], ['dev', 'lapis', 'Em desenvolvimento', 'racha'], ['comunidade', 'pessoas', 'Comunidade', 'racha'], ['populares', 'fogo', 'Populares', 'racha'],
  ['recentes', 'relogio', 'Recentes', 'racha'], ['favoritos', 'coracao', 'Favoritos', 'racha'], ['oficiais', 'escudo', 'Oficiais', 'racha'], ['compartilhados', 'compartilhar', 'Compartilhados', 'racha'],
  ['moderacao', 'bandeira', 'Moderação', 'racha'],
  ['rachao', 'rachao', 'Estádios', 'rachao'], ['rachao_salas', 'online', 'Salas online', 'rachao']];   // v97: o Rachão (tools/oficina/rachao.js) · v98: as salas online dele (rachao_sala.js)
const modoDaAba = id => { const a = ABAS_HUB.find(x => x[0] === id); return a ? a[3] : 'racha'; };   // (a busca e o resto: RACHA)
const SUBS_COMUNIDADE = [['populares', 'Mais jogados'], ['curtidos', 'Mais curtidos'], ['recentes', 'Novidades'], ['competitivos', 'Competitivos'], ['criativos', 'Criativos'],
  ['treino', 'Treinamento'], ['minigames', 'Minigames'], ['escolha', 'Escolha da comunidade']];
const N_VIS = { publico: 'Público', naoListado: 'Não listado', privado: 'Privado' };
const N_MOTIVO = [['ofensivo', 'Conteúdo ofensivo'], ['copia', 'Cópia de outro mapa'], ['spam', 'Spam'], ['quebrado', 'Mapa quebrado (não dá para jogar)'], ['nome', 'Nome ou descrição impróprios'], ['outro', 'Outro motivo']];
const thumbSegura = t => typeof t === 'string' && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(t) && t.length <= 60000 ? t : '';

/* ---------------------------------------------------------------- os ajudantes */
async function copiaTexto(t) {
  try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(t); return true; } } catch (_) {}
  try { const a = h('textarea', { style: 'position:fixed;left:-9999px;top:0' }); a.value = t; document.body.appendChild(a); a.select(); const ok = document.execCommand('copy'); a.remove(); return ok; } catch (_) { return false; }
}
const copiaAviso = async (t, rot) => aviso((await copiaTexto(t)) ? (rot || 'Copiado') + ': ' + t : 'Não deu para copiar. Anote: ' + t);
async function quemSou(forca) {                         // quem sou eu no servidor das salas (a equipe vê a moderação; quantos públicos eu tenho)
  if (!forca && HUB.eu && Date.now() - HUB.euT < 120000 && conectado()) return HUB.eu;
  const r = await pede('eu', {}, 6000);
  if (r && r.ok) { HUB.eu = r; HUB.euT = Date.now(); OFI.eu = r; }
  return HUB.eu;
}
function novoRascunho(mapa, extra) {                  // um mapa novo no aparelho (vira o rascunho que o editor abre)
  const agora = Date.now(), m = JSON.parse(JSON.stringify(mapa));
  const reg = Object.assign({ id: novoIdLocal(), nome: m.nome, mapa: m, criado: agora, editado: agora, thumb: '', thumbT: agora, remoto: null, publicado: 0, sujo: false, origem: '' }, extra || {});
  reg.thumb = DES.miniatura(reg.mapa, 160, 90);
  return GAVETA.poe('mapas', reg).then(() => GAVETA.novaVersao(reg.id, reg.mapa, 'criado', false)).then(() => reg);
}
async function abreRascunho(reg) { try { await editorAbre(reg); } catch (e) { console.error('Oficina (abrir):', e); aviso('Não deu para abrir o mapa.', 'erro'); } }
function miniaturaDe(chave, faz) {                    // (as miniaturas dos modelos: uma vez só)
  if (HUB.thumbs.has(chave)) return HUB.thumbs.get(chave);
  let t = ''; try { t = DES.miniatura(faz(), 160, 90); } catch (_) {}
  HUB.thumbs.set(chave, t); return t;
}
const imgMapa = (t, cls) => { const s = thumbSegura(t); return s ? h('img' + (cls ? '.' + cls : ''), { src: s, alt: '', loading: 'lazy', draggable: 'false' }) : h('div.ofi-sem-thumb' + (cls ? '.' + cls : ''), icone('mapa')); };

/* ---------------------------------------------------------------- a tela */
const HU = {};
OFI.telas.hub = {
  monta() {
    const el = h('div.ofi-tela.ofi-hub');
    HU.busca = h('input.ofi-in.ofi-busca', { type: 'search', placeholder: 'Buscar mapa por nome ou código', maxLength: 40, autocomplete: 'off', 'aria-label': 'Buscar mapa por nome ou código', enterKeyHint: 'search' });
    HU.busca.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); busca(); } });
    el.appendChild(h('div.ofi-hub-topo',
      botao('', () => OFI.fecha(), 'ofi-voltar', 'voltar', 'Voltar para o jogo'),
      h('div.ofi-hub-marca', icone('oficina'), h('b', { texto: 'OFICINA' }), h('small', { texto: 'DE CRIAÇÃO' })),
      h('div.ofi-hub-busca', HU.busca, botao('', busca, 'ofi-ic-bt', 'lupa', 'Buscar')),
      botao('SALA', () => entraSalaCodigo(), 'escuro ofi-hub-sala', 'pessoas', 'Entrar numa sala pelo código'),
      HU.criar = botao('CRIAR', () => criaEscolha(), 'ama ofi-hub-criar', 'novo', 'Criar no modo RACHA (mapa) ou no modo Rachão (estádio)')));
    // v98: o modo da Oficina, no topo (RACHA | RACHÃO): troca as abas, o CRIAR e as salas
    HU.modo = h('div.ofi-modo', { role: 'tablist', 'aria-label': 'Modo da Oficina' },
      ...MODOS_OFI.map(m => comDados(h('button.ofi-modo-bt', { type: 'button', role: 'tab', on: { click: () => { try { som.clique(); } catch (_) {} mudaModo(m); } } },
        icone(m === 'racha' ? 'tampinha' : 'rachao'), h('span', { texto: m === 'racha' ? 'RACHA' : 'RACHÃO' })), { m })));
    el.querySelector('.ofi-hub-marca').after(HU.modo);
    HU.nav = h('nav.ofi-hub-nav', { 'aria-label': 'Seções da Oficina' });
    for (const [id, ic, nome] of ABAS_HUB) HU.nav.appendChild(comDados(botao(nome, () => mudaAba(id), 'ofi-hub-aba', ic), { a: id }));
    HU.cab = h('div.ofi-hub-cab'); HU.aviso = h('div.ofi-hub-avisos'); HU.grade = h('div.ofi-grade'); HU.mais = h('div.ofi-hub-mais');
    HU.conteudo = h('main.ofi-hub-conteudo', HU.cab, HU.aviso, HU.grade, HU.mais);
    el.appendChild(h('div.ofi-hub-meio', HU.nav, HU.conteudo));
    return el;
  },
  abre(arg) {
    if (arg && arg.aba) HUB.aba = arg.aba;
    else if (HUB.aba !== 'busca' && modoDaAba(HUB.aba) !== HUB.modo) HUB.aba = HUB.abaDe[HUB.modo] || (HUB.modo === 'rachao' ? 'rachao' : 'meus');   // v98: abre no modo guardado
    if (arg && arg.sub) HUB.sub = arg.sub;
    mudaAba(HUB.aba, true);
    quemSou().then(() => marcaNav()).catch(() => {});
    verificaRecupera();
  },
  volta() { OFI.fecha(); },
};
function marcaNav() {
  const staff = !!(HUB.eu && HUB.eu.staff);
  for (const b of HU.nav.children) { b.classList.toggle('on', b.dataset.a === HUB.aba); b.hidden = modoDaAba(b.dataset.a) !== HUB.modo || (b.dataset.a === 'moderacao' && !staff); }
  if (HU.modo) for (const b of HU.modo.children) { const on = b.dataset.m === HUB.modo; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); }   // v98
  const bu = HU.busca && HU.busca.closest('.ofi-hub-busca'); if (bu) bu.hidden = HUB.modo !== 'racha';   // (a busca é dos mapas do RACHA)
  const raiz = HU.nav && HU.nav.closest('.ofi-hub'); if (raiz) raiz.dataset.modo = HUB.modo;
}
function mudaModo(m) {                                // v98: RACHA ou RACHÃO (cada modo volta para a aba em que estava)
  if (MODOS_OFI.indexOf(m) < 0) return;
  if (m === HUB.modo && OFI.tela === 'hub') return;
  if (HUB.aba !== 'busca') HUB.abaDe[HUB.modo] = HUB.aba;
  mudaAba(HUB.abaDe[m] || (m === 'rachao' ? 'rachao' : 'meus'));
}
function mudaAba(id, forca) {
  if (id === 'populares' || id === 'recentes') { HUB.aba = 'comunidade'; HUB.sub = id; }
  else HUB.aba = id;
  const md = modoDaAba(HUB.aba);                         // v98: a aba é de um modo (abrir uma aba do outro modo troca o modo)
  if (md !== HUB.modo) { HUB.modo = md; try { localStorage.setItem(MODO_OFI_CHAVE, md); } catch (_) {} }
  else try { localStorage.setItem(MODO_OFI_CHAVE, md); } catch (_) {}
  if (id !== 'busca') HUB.busca = '';
  marcaNav();
  HUB.itens = []; HUB.pagina = 0; HUB.total = 0;
  carregaAba(true);
  if (HU.conteudo) HU.conteudo.scrollTop = 0;
}
function busca() {
  const t = HU.busca.value.trim();
  if (t.length < 2) return aviso('Digite pelo menos 2 letras (ou o código do mapa).');
  HUB.aba = 'busca'; HUB.busca = t; marcaNav(); HUB.itens = []; HUB.pagina = 0; carregaAba(true);
}
function cabecalho(tit, sub, extra) {
  limpaFilhos(HU.cab);
  poe(HU.cab, h('div.ofi-hub-tit', h('b', { texto: tit }), sub ? h('small', { texto: sub }) : null), extra || null);
}
function avisoHub(t, cls, botoes) { HU.aviso.appendChild(h('div.ofi-hub-aviso' + (cls ? '.' + cls : ''), icone(cls === 'erro' ? 'alerta' : 'nuvem'), h('span', { texto: t }), ...(botoes || []))); }
async function carregaAba(novo) {
  const gen = ++HUB.gen, aba = HUB.aba;
  if (novo) { limpaFilhos(HU.grade); limpaFilhos(HU.mais); limpaFilhos(HU.aviso); }
  const vivo = () => gen === HUB.gen && OFI.tela === 'hub';
  try {
    if (aba === 'meus' || aba === 'dev') return await abaLocais(aba, vivo);
    if (aba === 'rachao') return abaRachao(vivo);          // v97: o Rachão e os estádios dele (tools/oficina/rachao.js)
    if (aba === 'rachao_salas') return abaRachaoSalas(vivo);   // v98: as salas online do Rachão (tools/oficina/rachao_sala.js)
    if (aba === 'oficiais') cabecalho('Oficiais', 'Os modelos do RACHA (funcionam sem internet) e os mapas que a equipe marcou como oficiais');
    if (aba === 'oficiais' && novo) modelosNaGrade();
    if (aba === 'comunidade') cabecalhoComunidade();
    if (aba === 'favoritos') cabecalho('Favoritos', 'Os mapas que você marcou com a estrela');
    if (aba === 'compartilhados') cabecalho('Compartilhados comigo', 'Mapas em que você é colaborador');
    if (aba === 'busca') cabecalho('Busca: "' + HUB.busca + '"', 'Pelo nome, pelo criador, por uma etiqueta ou pelo código de 7 letras');
    if (aba === 'moderacao') return await abaModeracao(vivo);
    const q = { aba: aba === 'comunidade' ? HUB.sub : aba === 'busca' ? 'busca' : aba, pagina: HUB.pagina };
    if (aba === 'busca') q.busca = HUB.busca;
    if (novo && aba === 'comunidade') salasComMapa();
    const carregando = h('div.ofi-carregando', h('i'), h('span', { texto: 'Carregando…' })); HU.mais.replaceChildren(carregando);
    const r = await pede('lista', q);
    if (!vivo()) return;
    limpaFilhos(HU.mais);
    if (!r.ok) {
      if (r.semRede) avisoHub('Sem conexão com o servidor das salas: a comunidade aparece quando ele estiver ligado. Os seus mapas do aparelho e os modelos funcionam normalmente.', 'erro', [botao('TENTAR DE NOVO', () => carregaAba(true), 'escuro')]);
      else avisoHub(r.erro || 'Não deu para carregar.', 'erro', [botao('TENTAR DE NOVO', () => carregaAba(true), 'escuro')]);
      return;
    }
    HUB.total = r.total; HUB.pagina = r.pagina;
    if (aba === 'busca' && r.itens.length === 1 && /^[A-Z0-9]{7}$/.test(HUB.busca.toUpperCase().replace(/[^A-Z0-9]/g, ''))) detalhesMapa(r.itens[0]);
    for (const m of r.itens) { HUB.itens.push(m); HU.grade.appendChild(cartaoRemoto(m)); }
    if (!HUB.itens.length && aba !== 'oficiais') HU.grade.appendChild(h('div.ofi-vazio', icone(aba === 'favoritos' ? 'coracao' : 'mapa'), h('b', { texto: aba === 'busca' ? 'Nenhum mapa encontrado.' : aba === 'favoritos' ? 'Nenhum favorito ainda.' : aba === 'compartilhados' ? 'Ninguém compartilhou um mapa com você ainda.' : 'Nada por aqui ainda.' }),
      h('small', { texto: aba === 'busca' ? 'Confira o código (7 letras e números) ou tente outra palavra.' : 'Crie o seu e publique: ele aparece aqui para todo mundo.' })));
    if ((r.pagina + 1) * r.porPagina < r.total) HU.mais.appendChild(botao('CARREGAR MAIS', () => { HUB.pagina++; carregaAba(false); }, 'escuro'));
  } catch (e) { console.error('Oficina (central):', e); if (vivo()) avisoHub('Algo deu errado ao carregar. Tente de novo.', 'erro'); }
}
function cabecalhoComunidade() {
  const chips = h('div.ofi-chips', { role: 'tablist' });
  for (const [id, nome] of SUBS_COMUNIDADE) chips.appendChild(botao(nome, () => { HUB.sub = id; HUB.itens = []; HUB.pagina = 0; carregaAba(true); }, 'ofi-chip' + (HUB.sub === id ? ' on' : '')));
  cabecalho('Comunidade', 'Os mapas públicos da galera', chips);
}

/* ---------------------------------------------------------------- os mapas do aparelho */
async function abaLocais(aba, vivo) {
  cabecalho(aba === 'dev' ? 'Em desenvolvimento' : 'Meus mapas', aba === 'dev' ? 'Rascunhos que ainda não foram publicados (ou com mudanças que a comunidade ainda não viu)' : 'Os mapas que você criou neste aparelho e os seus publicados');
  const regs = (await GAVETA.todos('mapas')).sort((a, b) => (b.editado || 0) - (a.editado || 0));
  if (!vivo()) return;
  const lista = aba === 'dev' ? regs.filter(r => !r.remoto || r.sujo) : regs;
  HU.grade.appendChild(h('button.ofi-cartao.ofi-cartao-novo', { type: 'button', on: { click: () => criaDialogo() } }, h('div.ofi-cartao-img', icone('adicionar')), h('div.ofi-cartao-tx', h('b', { texto: 'CRIAR NOVO MAPA' }), h('small', { texto: 'Do zero ou de um modelo' }))));
  for (const reg of lista) HU.grade.appendChild(cartaoLocal(reg));
  if (GAVETA.modo === 'ls') avisoHub('Este navegador não deixou usar o banco do aparelho: os mapas ficam guardados de um jeito mais limitado. Publique os importantes (pode ser como privado) para não perder.', 'erro');
  if (aba === 'meus') {                                // os publicados que não estão neste aparelho (de outro celular, ou apagados daqui)
    const r = await pede('lista', { aba: 'meus' }, 8000);
    if (!vivo() || !r.ok) return;
    if (r.maxPublicos) { if (HUB.eu) HUB.eu.publicos = r.publicos; HU.cab.appendChild(cotaPublicos(r.publicos, r.maxPublicos, r.semLimite)); }
    const noServidor = new Map(r.itens.map(m => [m.id, m]));
    for (const reg of regs) {                          // (os publicados deste aparelho ganham os números do servidor: jogos, curtidas, favoritos)
      const m = reg.remoto && noServidor.get(reg.remoto.id), el = m && HU.grade.querySelector('.ofi-cartao[data-id="' + reg.id + '"] .ofi-cartao-tx');
      if (el) { el.insertBefore(statsMapa(m), el.querySelector('.ofi-selos')); const s = el.querySelector('.ofi-selos'); if (s && m.visibilidade !== 'publico') s.appendChild(h('em.ofi-selo', { texto: N_VIS[m.visibilidade].toUpperCase() })); }
    }
    const aqui = new Set(regs.filter(x => x.remoto).map(x => x.remoto.id));
    const fora = r.itens.filter(m => !aqui.has(m.id));
    if (fora.length) { HU.grade.appendChild(h('div.ofi-sep', { texto: 'PUBLICADOS (NO SERVIDOR)' })); for (const m of fora) HU.grade.appendChild(cartaoRemoto(m)); }
  }
}
// "PÚBLICOS 2 DE 3": cada jogador tem até 3 mapas na comunidade (os não listados e os privados não contam)
function cotaPublicos(n, max, semLimite) {
  const cheio = !semLimite && n >= max;
  return h('div.ofi-cota' + (cheio ? '.cheio' : ''), { title: 'Cada jogador pode ter até ' + max + ' mapas públicos (os que aparecem na comunidade, com as curtidas e os favoritos). Os não listados e os privados não contam.', role: 'status' },
    icone('pessoas'), h('b', { texto: 'PÚBLICOS ' + n + (semLimite ? '' : ' DE ' + max) }), h('small', { texto: semLimite ? 'equipe: sem limite' : cheio ? 'cheio: publique como não listado ou privado' : 'na comunidade' }));
}
function cartaoLocal(reg) {
  const M = reg.mapa, P = M.partida;
  const sel = [];
  if (reg.remoto) sel.push(h('em.ofi-selo.verde', { texto: 'PUBLICADO · ' + reg.remoto.codigo }));
  if (reg.remoto && reg.sujo) sel.push(h('em.ofi-selo.ama', { texto: 'MUDANÇAS NÃO PUBLICADAS' }));
  if (!reg.remoto) sel.push(h('em.ofi-selo', { texto: 'RASCUNHO' }));
  return h('div.ofi-cartao', { role: 'group', 'aria-label': reg.nome, dados: { id: reg.id } },
    h('button.ofi-cartao-img', { type: 'button', title: 'Editar', on: { click: () => abreRascunho(reg) } }, imgMapa(reg.thumb)),
    h('div.ofi-cartao-tx', h('b', { texto: reg.nome }), h('small', { texto: P.equipes + ' times · ' + P.porTime + ' por time · editado ' + quando(reg.editado) }), h('div.ofi-selos', ...sel)),
    h('div.ofi-cartao-bts', botao('EDITAR', () => abreRascunho(reg), 'ama', 'lapis'), botao('', () => OFJ.local(reg.mapa, { volta: 'hub' }), 'ofi-ic-bt', 'play', 'Testar'), botao('', () => acoesRascunho(reg), 'ofi-ic-bt', 'mais', 'Mais opções')));
}
function acoesRascunho(reg) {
  janela(reg.nome, (c, ctx) => {
    const it = (ic, t, sub, f, cls) => c.appendChild(h('button.ofi-item' + (cls ? '.' + cls : ''), { type: 'button', on: { click: () => { ctx.fecha(null); f(); } } }, icone(ic), h('span', h('b', { texto: t }), h('small', { texto: sub }))));
    it('lapis', 'EDITAR', 'Abrir no editor', () => abreRascunho(reg));
    it('play', 'TESTAR', 'Partida instantânea neste aparelho, com bots', () => OFJ.local(reg.mapa, { volta: 'hub' }));
    it('pessoas', 'CRIAR SALA (FECHADA)', 'Jogar online só com quem tiver o código — com a física da sala', () => criaSalaDialogo({ M: reg.mapa, nome: reg.nome, volta: 'hub' }));
    it('nuvem', reg.remoto ? 'PUBLICAR VERSÃO NOVA' : 'PUBLICAR', reg.remoto ? 'A versão de agora vai para a comunidade (as antigas ficam guardadas)' : 'Mandar para a comunidade', () => publicaDialogo(reg, reg.mapa));
    if (reg.remoto) it('mapa', 'VER NA COMUNIDADE', 'A página do mapa publicado (' + reg.remoto.codigo + ')', () => abreRemoto({ id: reg.remoto.id }));
    it('duplicar', 'DUPLICAR', 'Uma cópia para mexer sem estragar este', () => duplicaRascunho(reg, false));
    it('texto', 'RENOMEAR', 'Trocar o nome', () => renomeiaRascunho(reg));
    it('lixo', 'APAGAR DO APARELHO', reg.remoto ? 'O publicado continua no servidor' : 'Apaga o rascunho e as versões dele', () => apagaRascunho(reg), 'perigo');
  }, [], 'ofi-menu');
}
async function renomeiaRascunho(reg) {
  const n = await pergunta('Renomear', 'O nome do mapa:', reg.nome, RM.LIM.nome); if (n == null) return;
  const t = RM.texto(n, RM.LIM.nome); if (!t) return aviso('O nome não pode ficar vazio.');
  reg.nome = t; reg.mapa.nome = t; reg.editado = Date.now(); if (reg.remoto) reg.sujo = true;
  await GAVETA.poe('mapas', reg); carregaAba(true);
}
async function apagaRascunho(reg) {
  if (!(await confirma('Apagar «' + reg.nome + '»?', reg.remoto ? 'Some deste aparelho (e as versões locais). O mapa publicado continua no servidor: apague por lá se quiser.' : 'O rascunho e as versões dele somem deste aparelho. Não dá para desfazer (para guardar uma cópia no servidor, publique antes — pode ser como privado).', 'APAGAR', 'verm'))) return;
  await GAVETA.apagaMapa(reg.id); aviso('Mapa apagado do aparelho.'); carregaAba(true);
}
async function duplicaRascunho(reg, abrir) {
  const m = JSON.parse(JSON.stringify(reg.mapa)); m.nome = RM.texto('Cópia de ' + reg.nome, RM.LIM.nome); m.id = ''; m.codigo = '';
  const novo = await novoRascunho(m, { origem: reg.remoto ? reg.remoto.id : reg.origem || '' });
  aviso('Cópia criada: ' + novo.nome);
  if (abrir !== false && OFI.tela === 'editor') { await editorSai(); return abreRascunho(novo); }
  if (OFI.tela === 'hub') carregaAba(true);
  return novo;
}
// a recuperação vale quando o retrato do editor é mais novo que o último salvamento E é diferente do que ficou salvo
// (pela data só, uma mudança logo depois de salvar — o automático salva 2,5 s depois — se perderia sem aviso)
function recuperaVale(rec, reg) { return !!(rec && rec.dados && reg && rec.t > (reg.editado || 0) && JSON.stringify(rec.dados) !== JSON.stringify(reg.mapa)); }
async function verificaRecupera() {                    // o editor fechou sem salvar (o aparelho travou): o aviso para voltar
  try {
    const rec = await GAVETA.pega('recupera', 'sessao'); if (!rec || !rec.dados) return;
    const reg = await GAVETA.pega('mapas', rec.mapa); if (!reg || !recuperaVale(rec, reg)) return;
    if (OFI.tela !== 'hub') return;
    avisoHub('O editor fechou com alterações não salvas em «' + reg.nome + '» (' + quando(rec.t) + ').', '', [botao('RECUPERAR', () => abreRascunho(reg), 'ama'), botao('DESCARTAR', async () => { await GAVETA.tira('recupera', 'sessao'); carregaAba(true); }, 'escuro')]);
  } catch (_) {}
}

/* ---------------------------------------------------------------- v98: CRIAR — no modo RACHA (um mapa) ou no modo Rachão (um estádio) */
function criaEscolha() {
  janela('O que você quer criar?', (c, ctx) => {
    const op = (modo, arte, tit, sub, rot, f) => {
      const a = h('div.ofi-escolha-arte'); a.innerHTML = arte;   // (desenhos fixos, escritos aqui)
      return comDados(h('button.ofi-escolha' + (HUB.modo === modo ? '.on' : ''), { type: 'button', on: { click: () => { try { som.clique(); } catch (_) {} ctx.fecha(null); mudaModo(modo); f(); } } },
        a, h('span.ofi-escolha-tx', h('b', { texto: tit }), h('small', { texto: sub })), h('span.ofi-escolha-ir', { texto: rot })), { m: modo });
    };
    poe(c, h('div.ofi-escolhas',
      op('racha', ARTE_RACHA, 'Mapa do RACHA', 'O editor de mapas do RACHA: até 4 times, paredes, zonas, objetos e lógica. Dá para publicar na comunidade e abrir sala online.', 'CRIAR MAPA', () => criaDialogo()),
      op('rachao', RCH_ARTE, 'Estádio do Rachão', 'A oficina de estádios do Rachão: formato, gols, piso, física, obstáculos, vento e poderes. Dá para jogar e abrir sala online do Rachão.', 'CRIAR ESTÁDIO', () => rachaoAbre('novo'))),
      fNota('Os dois ficam separados: cada modo tem os seus criados e as suas salas (a escolha do modo fica no topo da Oficina).'));
  }, [], 'ofi-jan-larga ofi-jan-escolha');
}
// a arte do modo RACHA: o campo da tampinha visto de cima (as cores do RACHA: o Time A laranja e o Time B roxo)
const ARTE_RACHA = '<svg viewBox="0 0 240 150" aria-hidden="true" focusable="false">'
  + '<rect x="6" y="8" width="228" height="134" rx="14" fill="#123a2a" stroke="#05081e" stroke-width="4"/>'
  + '<rect x="20" y="22" width="200" height="106" rx="6" fill="#1f7a45"/>'
  + '<path d="M20 48h200M20 75h200M20 102h200" stroke="#23874d" stroke-width="13"/>'
  + '<rect x="20" y="22" width="200" height="106" rx="6" fill="none" stroke="#e9f7ec" stroke-width="2.5"/>'
  + '<path d="M120 22v106" stroke="#e9f7ec" stroke-width="2.5"/><circle cx="120" cy="75" r="17" fill="none" stroke="#e9f7ec" stroke-width="2.5"/>'
  + '<path d="M20 60h-9v30h9M220 60h9v30h-9" fill="rgba(255,255,255,.2)" stroke="#e9f7ec" stroke-width="2.5"/>'
  + '<path d="M58 36l38 8-10 34" fill="none" stroke="#ffd21f" stroke-width="3" stroke-dasharray="6 5" stroke-linecap="round"/>'
  + '<circle cx="78" cy="104" r="12" fill="#05081e"/><circle cx="78" cy="104" r="9.5" fill="#ff8a1f"/><circle cx="78" cy="104" r="9.5" fill="none" stroke="#ffd9a6" stroke-width="2" stroke-dasharray="2.2 2.2"/><circle cx="78" cy="104" r="4.2" fill="#ffd9a6"/>'
  + '<circle cx="160" cy="52" r="12" fill="#05081e"/><circle cx="160" cy="52" r="9.5" fill="#8a4dff"/><circle cx="160" cy="52" r="9.5" fill="none" stroke="#d9c6ff" stroke-width="2" stroke-dasharray="2.2 2.2"/><circle cx="160" cy="52" r="4.2" fill="#d9c6ff"/>'
  + '<rect x="150" y="92" width="38" height="9" rx="3" fill="#05081e"/><rect x="152" y="94" width="34" height="5" rx="2" fill="#9fb4c7"/>'
  + '<circle cx="96" cy="78" r="6" fill="#fff" stroke="#05081e" stroke-width="2.2"/></svg>';

/* ---------------------------------------------------------------- criar um mapa (do zero ou de um modelo) */
function criaDialogo() {
  let tam = 'pequeno', formato = 'retangulo';
  janela('Criar novo mapa', (c, ctx) => {
    const nome = h('input.ofi-in', { type: 'text', maxLength: RM.LIM.nome, value: 'Mapa novo', autocomplete: 'off', 'aria-label': 'Nome do mapa' });
    const segT = h('div.ofi-seg.quebra'), wIn = h('input.ofi-num', { type: 'number', min: RM.LIM.campoW[0], max: RM.LIM.campoW[1], value: 90, 'aria-label': 'Largura' }), hIn = h('input.ofi-num', { type: 'number', min: RM.LIM.campoH[0], max: RM.LIM.campoH[1], value: 60, 'aria-label': 'Altura' });
    const pers = h('div.ofi-f.ofi-pers', { hidden: true }, h('label.ofi-f-rot', { texto: 'Largura × altura (u)' }), h('div.ofi-f-val', wIn, h('span', { texto: '×' }), hIn));
    const marcaT = () => { for (const b of segT.children) b.classList.toggle('on', b.dataset.t === tam); pers.hidden = tam !== 'personalizado'; };
    for (const [id, t] of Object.entries(TAMANHOS).concat([['personalizado', { nome: 'Personalizado', w: 0, h: 0, por: 0 }]])) segT.appendChild(comDados(botao(t.nome + (t.w ? ' · ' + t.w + '×' + t.h : ''), () => { tam = id; marcaT(); }, 'ofi-seg-bt'), { t: id }));
    const segF = h('div.ofi-formatos');
    const icF = { retangulo: 'retangulo', quadrado: 'retangulo', circulo: 'circulo', octogono: 'poligono', arena: 'campo', paredes: 'parede', aberto: 'olhoNao', assimetrico: 'triangulo', livre: 'linha' };
    const marcaF = () => { for (const b of segF.children) b.classList.toggle('on', b.dataset.f === formato); };
    for (const f of FORMATOS) segF.appendChild(comDados(botao(f.nome, () => { formato = f.id; marcaF(); }, 'ofi-formato', icF[f.id]), { f: f.id }));
    marcaT(); marcaF();
    const cria = async () => {
      const w = clamp(parseFloat(wIn.value) || 90, RM.LIM.campoW[0], RM.LIM.campoW[1]), hh = clamp(parseFloat(hIn.value) || 60, RM.LIM.campoH[0], RM.LIM.campoH[1]);
      const cru = mapaDoZero(tam === 'personalizado' ? null : tam, formato, w, hh);
      cru.nome = RM.texto(nome.value, RM.LIM.nome) || 'Mapa novo';
      const mapa = limpaModelo(cru, cru.nome);
      ctx.fecha(null);
      abreRascunho(await novoRascunho(mapa));
    };
    poe(c, h('div.ofi-cria',
      h('section.ofi-cria-zero', h('h3', { texto: 'DO ZERO' }), fLinha('Nome', nome), fLinha('Tamanho', segT), pers, fLinha('Formato', segF),
        fBotoes(botao('CRIAR MAPA', cria, 'ama', 'check'))),
      h('section.ofi-cria-modelos', h('h3', { texto: 'OU COMECE DE UM MODELO' }), h('div.ofi-modelos', ...MODELOS.map(md => h('button.ofi-modelo', { type: 'button', title: md.sub, on: { click: async () => { ctx.fecha(null); abreRascunho(await novoRascunho(limpaModelo(md.faz(), md.nome))); } } },
        imgMapa(miniaturaDe('modelo:' + md.id, () => limpaModelo(md.faz(), md.nome))), h('b', { texto: md.nome }), h('small', { texto: md.sub })))))));
  }, [], 'ofi-jan-larga');
}
function modelosNaGrade() {                            // (na aba Oficiais: os modelos primeiro, sem precisar de internet)
  HU.grade.appendChild(h('div.ofi-sep', { texto: 'MODELOS DO RACHA' }));
  for (const md of MODELOS) HU.grade.appendChild(h('div.ofi-cartao', { role: 'group', 'aria-label': md.nome },
    h('button.ofi-cartao-img', { type: 'button', on: { click: () => modeloDialogo(md) } }, imgMapa(miniaturaDe('modelo:' + md.id, () => limpaModelo(md.faz(), md.nome)))),
    h('div.ofi-cartao-tx', h('b', { texto: md.nome }), h('small', { texto: md.sub }), h('div.ofi-selos', h('em.ofi-selo.azul', { texto: 'OFICIAL' }))),
    h('div.ofi-cartao-bts', botao('USAR', async () => abreRascunho(await novoRascunho(limpaModelo(md.faz(), md.nome))), 'ama', 'lapis'), botao('', () => OFJ.local(limpaModelo(md.faz(), md.nome), { volta: 'hub' }), 'ofi-ic-bt', 'play', 'Testar'))));
  HU.grade.appendChild(h('div.ofi-sep', { texto: 'OFICIAIS DA COMUNIDADE' }));
}
function modeloDialogo(md) {
  const M = limpaModelo(md.faz(), md.nome);
  janela(md.nome, (c, ctx) => {
    poe(c, h('div.ofi-det', h('div.ofi-det-img', imgMapa(miniaturaDe('modelo:' + md.id, () => M))), h('div.ofi-det-tx', h('p', { texto: M.descricao || md.sub }), infoMapa(M))),
      fBotoes(botao('USAR ESTE MODELO', async () => { ctx.fecha(null); abreRascunho(await novoRascunho(limpaModelo(md.faz(), md.nome))); }, 'ama', 'lapis'),
        botao('TESTAR', () => { ctx.fecha(null); OFJ.local(M, { volta: 'hub' }); }, 'escuro', 'play'),
        botao('CRIAR SALA', () => { ctx.fecha(null); criaSalaDialogo({ M, nome: M.nome, volta: 'hub' }); }, 'escuro', 'pessoas')));
  }, [], 'ofi-jan-larga');
}
function infoMapa(M) {
  const P = M.partida, k = M.campo, F = RM.PRESETS[M.fisica.preset];
  const linha = (a, b) => h('div.ofi-info-l', h('span', { texto: a }), h('b', { texto: b }));
  return h('div.ofi-info', linha('Modo', N_MODO[P.modo] || P.modo), linha('Times', P.equipes + ' × ' + P.porTime + (P.porMin !== P.porMax ? ' (' + P.porMin + ' a ' + P.porMax + ')' : '')),
    linha('Campo', Math.round(k.w) + ' × ' + Math.round(k.h) + ' u'), linha('Vitória', P.vitoria === 'sobrevivencia' ? 'sobrevivência (' + P.meta + ' rodadas)' : P.meta ? P.meta + ' gols' : 'sem limite'),
    linha('Tempo', P.tempo ? P.tempo + ' min' : 'sem tempo'), linha('Física', F ? F.nome : 'Personalizada'), linha('Objetos', String(M.objetos.length)));
}

/* ---------------------------------------------------------------- os mapas do servidor (o catálogo) */
function cartaoRemoto(m) {
  const sel = [];
  if (m.oficial) sel.push(h('em.ofi-selo.azul', { texto: 'OFICIAL' }));
  if (m.destaque) sel.push(h('em.ofi-selo.ama', { texto: 'ESCOLHA DA COMUNIDADE' }));
  if (m.visibilidade !== 'publico') sel.push(h('em.ofi-selo', { texto: N_VIS[m.visibilidade].toUpperCase() }));
  if (m.estado === 'oculto') sel.push(h('em.ofi-selo.verm', { texto: 'EM ANÁLISE' }));
  if (m.meu && m.meu.dono) sel.push(h('em.ofi-selo.verde', { texto: 'SEU' }));
  else if (m.meu && m.meu.colab) sel.push(h('em.ofi-selo.verde', { texto: 'COLABORADOR' }));
  return h('div.ofi-cartao', { role: 'group', 'aria-label': m.nome, dados: { m: m.id } },
    h('button.ofi-cartao-img', { type: 'button', on: { click: () => detalhesMapa(m) } }, imgMapa(m.thumb)),
    h('div.ofi-cartao-tx', h('b', { texto: m.nome }), h('small', { texto: 'por ' + m.autor + ' · ' + m.equipes + ' times · ' + m.porTime + ' por time' }),
      statsMapa(m, true), h('div.ofi-selos', ...sel)),
    h('div.ofi-cartao-bts', botao('JOGAR', () => jogaPublicado(m), 'ama', 'play', 'Criar uma sala com este mapa'), botao('', () => detalhesMapa(m), 'ofi-ic-bt', 'mais', 'Detalhes')));
}
// as partidas, as curtidas e os favoritos do mapa — no cartão do catálogo, o coração e a estrela curtem e favoritam na hora
function statsMapa(m, toca) {
  const eu = m.meu || (m.meu = {});
  if (!toca) return h('div.ofi-stats', h('span', { title: 'Partidas' }, icone('play'), fmt(m.jogos)), h('span', { title: 'Curtidas' }, icone('coracao'), fmt(m.curtidas)), h('span', { title: 'Favoritos' }, icone('estrela'), fmt(m.favoritos)));
  const bt = (ic, k, chave, op, rotOn, rotOff) => {
    const b = h('button.ofi-stat-bt' + (eu[chave] ? '.on' : ''), { type: 'button', 'aria-pressed': String(!!eu[chave]), title: eu[chave] ? rotOn : rotOff }, icone(ic), h('span', { texto: fmt(m[k]) }));
    b.addEventListener('click', async e => {
      e.stopPropagation(); if (b.disabled) return; b.disabled = true;
      try {
        const r = await pede(op, { id: m.id, on: !eu[chave] });
        if (!r.ok) return aviso(r.erro || (r.semRede ? 'Sem conexão com o servidor agora.' : 'Não deu.'), 'erro');
        eu[chave] = op === 'curtir' ? !!r.curti : !!r.favorito; m[k] = op === 'curtir' ? r.curtidas : r.favoritos;
        b.classList.toggle('on', eu[chave]); b.setAttribute('aria-pressed', String(eu[chave])); b.title = eu[chave] ? rotOn : rotOff; b.querySelector('span').textContent = fmt(m[k]);
        try { som.clique(); } catch (_) {}
      } finally { b.disabled = false; }
    });
    return b;
  };
  return h('div.ofi-stats', h('span', { title: 'Partidas' }, icone('play'), fmt(m.jogos)), bt('coracao', 'curtidas', 'curti', 'curtir', 'Curtido (tocar tira a curtida)', 'Curtir'), bt('estrela', 'favoritos', 'favorito', 'favorito', 'Nos favoritos (tocar tira)', 'Favoritar'));
}
async function abreRemoto(ref) { const r = await pede('abrir', ref); if (!r.ok) return aviso(r.erro || 'Não deu para abrir.', 'erro'); detalhesMapa(r.meta, r); }
function jogaPublicado(m, volta) { return criaSalaDialogo({ ref: { id: m.id }, meta: m, volta: volta || 'hub' }); }   // (a janela CRIAR SALA: sala.js)
async function baixaMapa(m, versao) {                 // o mapa completo (para testar, editar ou duplicar)
  const r = await pede('abrir', versao ? { id: m.id, versao } : { id: m.id });
  if (!r.ok) { aviso(r.erro || 'Não deu para abrir o mapa.', 'erro'); return null; }
  const l = RM.limpa(r.mapa); if (!l.ok) { aviso('O mapa veio com problemas: ' + (l.erros || []).join(' · '), 'erro'); return null; }
  return { mapa: l.mapa, meta: r.meta, versao: r.versao };
}
async function editaPublicado(m, versao) {
  const regs = await GAVETA.todos('mapas'), aqui = regs.find(x => x.remoto && x.remoto.id === m.id);
  if (aqui && !versao) {
    const usa = await janela('Editar «' + m.nome + '»', c => c.appendChild(h('p.ofi-jan-tx', { texto: 'Este aparelho já tem um rascunho deste mapa (editado ' + quando(aqui.editado) + '). Continuar nele ou baixar a versão publicada (' + m.versao + ')?' })),
      [{ rot: 'CANCELAR', v: null, cls: 'escuro' }, { rot: 'BAIXAR A PUBLICADA', v: 'baixa', cls: 'escuro' }, { rot: 'CONTINUAR O RASCUNHO', v: 'usa', cls: 'ama' }]);
    if (!usa) return; if (usa === 'usa') return abreRascunho(aqui);
  }
  const b = await baixaMapa(m, versao); if (!b) return;
  const reg = await novoRascunho(b.mapa, { nome: b.mapa.nome + (versao ? ' (v' + versao + ')' : ''), remoto: { id: b.meta.id, codigo: b.meta.codigo, versao: b.versao } });
  if (versao) reg.sujo = true;
  abreRascunho(reg);
}
async function duplicaPublicado(m) {
  const b = await baixaMapa(m); if (!b) return;
  const mp = b.mapa; mp.nome = RM.texto('Cópia de ' + mp.nome, RM.LIM.nome); mp.id = ''; mp.codigo = '';
  const reg = await novoRascunho(mp, { origem: b.meta.id });
  aviso('Cópia criada nos seus mapas.'); abreRascunho(reg);
}
function detalhesMapa(m0, aberto) {
  let m = m0;
  janela(m.nome, (c, ctx) => {
    const corpo = h('div.ofi-det'), bts = h('div.ofi-p-bts.ofi-det-bts');
    const pinta = () => {
      limpaFilhos(corpo); limpaFilhos(bts);
      const eu = m.meu || {};
      poe(corpo, h('div.ofi-det-img', imgMapa(m.thumb)),
        h('div.ofi-det-tx',
          h('div.ofi-det-autor', h('span', { texto: 'por ' + m.autor }), h('button.ofi-codigo', { type: 'button', title: 'Copiar o código', on: { click: () => copiaAviso(m.codigo, 'Código copiado') } }, icone('copiar'), h('b', { texto: m.codigo }))),
          m.descricao ? h('p.ofi-det-desc', { texto: m.descricao }) : null,
          h('div.ofi-info',
            ...[['Categoria', N_CATEGORIA[m.categoria] || m.categoria], ['Modo', N_MODO[m.modo] || m.modo], ['Times', m.equipes + ' × ' + m.porTime], ['Versão', String(m.versao)],
              ['Partidas', fmt(m.jogos)], ['Curtidas', fmt(m.curtidas)], ['Favoritos', fmt(m.favoritos)], ['Atualizado', quando(m.editado)], ['Visibilidade', N_VIS[m.visibilidade] || ''],
              ['Copiar', m.permiteCopiar ? 'liberado' : 'só o criador']].concat(m.denuncias != null ? [['Denúncias', String(m.denuncias)]] : [])
              .map(([a, b]) => h('div.ofi-info-l', h('span', { texto: a }), h('b', { texto: b })))),
          m.estado === 'oculto' ? h('div.ofi-erro', icone('alerta'), h('span', { texto: 'Este mapa saiu do catálogo e está em análise pela moderação.' })) : null));
      const b = (rot, f, cls, ic, t) => bts.appendChild(botao(rot, f, cls, ic, t));
      if (eu.testar || m.estado === 'ok') b('CRIAR SALA', () => { ctx.fecha(null); jogaPublicado(m); }, 'ama', 'play', 'Abrir uma sala com este mapa (com a física da sala)');
      b('TESTAR', async () => { const x = await baixaMapa(m); if (x) { ctx.fecha(null); OFJ.local(x.mapa, { volta: 'hub' }); } }, 'escuro', 'bot', 'Partida neste aparelho, com bots');
      b(eu.curti ? 'CURTIDO' : 'CURTIR', async () => { const r = await pede('curtir', { id: m.id, on: !eu.curti }); if (!r.ok) return aviso(r.erro || 'Não deu.', 'erro'); m = Object.assign({}, m, { curtidas: r.curtidas, meu: Object.assign({}, m.meu, { curti: r.curti }) }); pinta(); }, eu.curti ? 'verm' : 'escuro', 'coracao');
      b(eu.favorito ? 'FAVORITO' : 'FAVORITAR', async () => { const r = await pede('favorito', { id: m.id, on: !eu.favorito }); if (!r.ok) return aviso(r.erro || 'Não deu.', 'erro'); m = Object.assign({}, m, { favoritos: r.favoritos, meu: Object.assign({}, m.meu, { favorito: r.favorito }) }); pinta(); }, eu.favorito ? 'ama' : 'escuro', 'estrela');
      b('COPIAR CÓDIGO', () => copiaAviso(m.codigo, 'Código copiado'), 'escuro', 'copiar');
      if (eu.editar) b('EDITAR', () => { ctx.fecha(null); editaPublicado(m); }, 'escuro', 'lapis');
      if (eu.duplicar) b('DUPLICAR', () => { ctx.fecha(null); duplicaPublicado(m); }, 'escuro', 'duplicar');
      if (eu.editar) b('VERSÕES', () => versoesRemotas(m), 'escuro', 'relogio');
      if (eu.dono || eu.staff) b('CONFIGURAR', () => configuraDialogo(m, nm => { m = nm; pinta(); }), 'escuro', 'campo');
      if (eu.dono) b('COLABORADORES', () => colaboradoresDialogo(m, nm => { m = nm; pinta(); }), 'escuro', 'pessoas');
      if (!eu.dono) b('DENUNCIAR', () => denunciaDialogo(m), 'escuro', 'bandeira');
      if (eu.staff) b('MODERAR', () => moderaDialogo(m, nm => { m = nm; pinta(); }), 'escuro', 'escudo');
      if (eu.dono || eu.staff) b('APAGAR', async () => { if (await confirma('Apagar «' + m.nome + '» do servidor?', 'O mapa, as versões, as curtidas e os favoritos somem para todo mundo. Os rascunhos nos aparelhos continuam.', 'APAGAR', 'verm')) { const r = await pede('apagar', { id: m.id }); if (!r.ok) return aviso(r.erro || 'Não deu.', 'erro'); aviso('Mapa apagado do servidor.'); ctx.fecha(null); await desligaRemoto(m.id); if (OFI.tela === 'hub') carregaAba(true); } }, 'verm', 'lixo');
    };
    poe(c, corpo, bts); pinta();
    if (!aberto && !m.thumb) pede('abrir', { id: m.id }).then(r => { if (r.ok) { m = Object.assign({}, r.meta, { thumb: r.meta.thumb || m.thumb }); pinta(); } }).catch(() => {});
  }, [], 'ofi-jan-larga ofi-jan-det');
}
async function desligaRemoto(id) { for (const reg of await GAVETA.todos('mapas')) if (reg.remoto && reg.remoto.id === id) { reg.remoto = null; reg.sujo = false; await GAVETA.poe('mapas', reg); } }
async function versoesRemotas(m) {
  const r = await pede('versoes', { id: m.id }); if (!r.ok) return aviso(r.erro || 'Não deu.', 'erro');
  const v = await janela('Versões de «' + m.nome + '»', (c, ctx) => {
    c.appendChild(h('p.ofi-jan-tx', { texto: 'O servidor guarda as últimas versões publicadas. Abrir uma no editor cria um rascunho com ela (publicar de novo vira a versão mais nova).' }));
    for (const x of r.versoes) c.appendChild(h('button.ofi-item', { type: 'button', on: { click: () => ctx.fecha(x) } }, icone('relogio'),
      h('span', h('b', { texto: 'Versão ' + x.versao + (x.nota ? ' · ' + x.nota : '') + (x.versao === m.versao ? ' (atual)' : '') }), h('small', { texto: new Date(x.t).toLocaleString('pt-BR') + ' · ' + x.objetos + ' objetos · por ' + x.por }))));
  }, [{ rot: 'FECHAR', v: null, cls: 'escuro' }]);
  if (v) editaPublicado(m, v.versao === m.versao ? null : v.versao);
}
async function configuraDialogo(m, depois) {
  let vis = m.visibilidade, copiaOk = m.permiteCopiar, nome, desc, cat = m.categoria;
  const eu = await quemSou(true), cheio = vis !== 'publico' && limitePublicosCheio(eu);
  janela('Configurar «' + m.nome + '»', c => {
    nome = h('input.ofi-in', { type: 'text', maxLength: RM.LIM.nome, value: m.nome }); desc = h('textarea.ofi-in', { maxLength: RM.LIM.descricao, rows: 3 }); desc.value = m.descricao || '';
    poe(c, fLinha('Nome', nome), fLinha('Descrição', desc), fSel('Categoria', cat, RM.CATEGORIAS.map(x => [x, N_CATEGORIA[x]]), v => { cat = v; }),
      fSel('Visibilidade', vis, opcoesVisibilidade(cheio), v => { vis = v; }),
      fNota(notaVisibilidade(eu, cheio)),
      fBool('Permitir copiar (duplicar) este mapa', copiaOk, v => { copiaOk = v; }));
  }, [{ rot: 'CANCELAR', v: null, cls: 'escuro' }, { rot: 'SALVAR', cls: 'ama', valor: () => true }]).then(async ok => {
    if (!ok) return;
    const r = await pede('config', { id: m.id, campos: { nome: nome.value, descricao: desc.value, categoria: cat, visibilidade: vis, permiteCopiar: copiaOk } });
    if (r.publicos != null && HUB.eu) HUB.eu.publicos = r.publicos;
    if (!r.ok) return aviso(r.erro || 'Não deu.', 'erro');
    aviso('Configurações salvas.'); depois(Object.assign({}, m, r.meta, { thumb: m.thumb }));
    if (OFI.tela === 'hub' && HUB.aba === 'meus') carregaAba(true);
  });
}
// o limite dos públicos (3 por jogador; a equipe não tem): cheio = não dá para deixar mais um público
const limitePublicosCheio = eu => !!(eu && eu.maxPublicos && !eu.semLimite && !eu.staff && eu.publicos >= eu.maxPublicos);
const opcoesVisibilidade = cheio => (cheio ? [] : [['publico', 'Público']]).concat([['naoListado', 'Não listado'], ['privado', 'Privado']]);
const notaVisibilidade = (eu, cheio) => cheio
  ? 'Você já tem ' + eu.publicos + ' mapas públicos (o máximo por jogador é ' + eu.maxPublicos + '): este fica não listado (só quem tem o código) ou privado. Para ele ir para a comunidade, deixe um dos públicos como não listado em CONFIGURAR (ou apague um).'
  : 'Público: aparece na comunidade, com as curtidas e os favoritos' + (eu && eu.maxPublicos && !eu.semLimite ? ' (cada jogador tem até ' + eu.maxPublicos + '; você tem ' + (eu.publicos | 0) + ')' : '') + '. Não listado: só quem tem o código. Privado: só você e os colaboradores.';
function colaboradoresDialogo(m, depois) {
  janela('Colaboradores', (c, ctx) => {
    const lista = h('div.ofi-colabs');
    const pinta = () => {
      limpaFilhos(lista);
      if (!(m.colaboradores || []).length) lista.appendChild(h('p.ofi-jan-tx', { texto: 'Ninguém ainda. Colaboradores podem editar, testar, publicar versões novas e duplicar (você escolhe o quê).' }));
      for (const x of m.colaboradores || []) {
        const perms = { editar: x.editar, testar: x.testar, publicar: x.publicar, duplicar: x.duplicar };
        const salva = async () => { const r = await pede('colab', { id: m.id, pub: x.pub, perms }); if (!r.ok) return aviso(r.erro || 'Não deu.', 'erro'); m = Object.assign({}, m, r.meta, { thumb: m.thumb }); depois(m); pinta(); };
        const chave = (k, rot) => { const b = botao(rot, () => { perms[k] = !perms[k]; salva(); }, 'ofi-chip' + (perms[k] ? ' on' : '')); return b; };
        lista.appendChild(h('div.ofi-colab', h('b', { texto: x.nome }), h('small', { texto: 'ID ' + x.pub }), h('div.ofi-chips', chave('editar', 'EDITAR'), chave('testar', 'TESTAR'), chave('publicar', 'PUBLICAR'), chave('duplicar', 'DUPLICAR')),
          botao('', async () => { const r = await pede('colab', { id: m.id, pub: x.pub, perms: null }); if (!r.ok) return aviso(r.erro || 'Não deu.', 'erro'); m = Object.assign({}, m, r.meta, { thumb: m.thumb }); depois(m); pinta(); }, 'ofi-ic-bt', 'lixo', 'Tirar')));
      }
    };
    const id = h('input.ofi-in', { type: 'text', inputMode: 'numeric', maxLength: 9, placeholder: 'ID do jogador (o número do cartão)' });
    poe(c, lista, h('div.ofi-f', h('label.ofi-f-rot', { texto: 'Adicionar' }), h('div.ofi-f-val', id, botao('ADICIONAR', async () => {
      const r = await pede('colab', { id: m.id, pub: id.value, perms: { editar: true, testar: true, publicar: false, duplicar: false } });
      if (!r.ok) return aviso(r.erro || 'Não deu.', 'erro'); id.value = ''; m = Object.assign({}, m, r.meta, { thumb: m.thumb }); depois(m); pinta(); aviso('Colaborador adicionado.');
    }, 'ama', 'adicionar'))));
    pinta();
  }, [{ rot: 'FECHAR', v: null, cls: 'escuro' }]);
}
function denunciaDialogo(m) {
  let motivo = 'ofensivo', texto;
  janela('Denunciar «' + m.nome + '»', c => {
    texto = h('textarea.ofi-in', { maxLength: 200, rows: 3, placeholder: 'Conte o que está errado (opcional)' });
    poe(c, fSel('Motivo', motivo, N_MOTIVO, v => { motivo = v; }), fLinha('Detalhes', texto), fNota('A equipe do RACHA olha cada denúncia. Com várias pessoas denunciando, o mapa sai do catálogo até a análise.'));
  }, [{ rot: 'CANCELAR', v: null, cls: 'escuro' }, { rot: 'DENUNCIAR', cls: 'verm', valor: () => true }]).then(async ok => {
    if (!ok) return;
    const r = await pede('denunciar', { id: m.id, motivo, texto: texto.value });
    aviso(!r.ok ? r.erro || 'Não deu.' : r.nova ? 'Denúncia enviada. Obrigado!' : 'Você já tinha denunciado este mapa.', r.ok ? '' : 'erro');
  });
}
function moderaDialogo(m, depois) {
  janela('Moderação · ' + m.codigo, (c, ctx) => {
    const it = (acao, ic, t, sub) => c.appendChild(h('button.ofi-item', { type: 'button', on: { click: async () => {
      const r = await pede('moderar', { id: m.id, acao }); if (!r.ok) return aviso(r.erro || 'Não deu.', 'erro');
      aviso('Feito: ' + t.toLowerCase()); ctx.fecha(null); depois(Object.assign({}, m, r.meta, { thumb: m.thumb }));
    } } }, icone(ic), h('span', h('b', { texto: t }), h('small', { texto: sub }))));
    it(m.estado === 'ok' ? 'ocultar' : 'restaurar', m.estado === 'ok' ? 'olhoNao' : 'olho', m.estado === 'ok' ? 'OCULTAR' : 'RESTAURAR', m.estado === 'ok' ? 'Tirar do catálogo (o criador continua vendo)' : 'Voltar para o catálogo');
    it('oficial', 'escudo', m.oficial ? 'TIRAR DE OFICIAL' : 'MARCAR COMO OFICIAL', 'Aparece na aba Oficiais');
    it('destaque', 'estrela', m.destaque ? 'TIRAR DA ESCOLHA' : 'ESCOLHA DA COMUNIDADE', 'Aparece em destaque na Comunidade');
    it('limpar', 'check', 'LIMPAR AS DENÚNCIAS', 'Analisado: zera as denúncias (e volta ao catálogo se saiu por elas)');
    it('remover', 'lixo', 'REMOVER', 'Some para todos (o criador não publica mais versões)');
  }, [{ rot: 'FECHAR', v: null, cls: 'escuro' }], 'ofi-menu');
}
async function abaModeracao(vivo) {
  cabecalho('Moderação', 'Mapas denunciados ou fora do catálogo (só a equipe vê)');
  const r = await pede('fila', {}); if (!vivo()) return;
  if (!r.ok) return avisoHub(r.erro || 'Não deu para carregar.', 'erro');
  if (!r.itens.length) HU.grade.appendChild(h('div.ofi-vazio', icone('check'), h('b', { texto: 'Nenhuma denúncia para olhar.' })));
  for (const m of r.itens) {
    const c = cartaoRemoto(m);
    c.appendChild(h('div.ofi-denuncias', ...m.lista.map(x => h('div', h('b', { texto: (N_MOTIVO.find(y => y[0] === x.motivo) || [0, x.motivo])[1] }), h('span', { texto: (x.texto ? ' — ' + x.texto : '') + ' · ' + x.nome + ', ' + quando(x.t) })))));
    HU.grade.appendChild(c);
  }
}

/* ---------------------------------------------------------------- as salas abertas com mapa (na Comunidade) */
function salasComMapa() {
  const caixa = h('div.ofi-salas'); HU.aviso.appendChild(caixa);
  const pinta = () => {
    limpaFilhos(caixa);
    const L = (typeof SL !== 'undefined' && Array.isArray(SL.lista) ? SL.lista : []).filter(s => s && s.mapa);
    if (!L.length) return;
    caixa.appendChild(h('div.ofi-sep', { texto: 'SALAS ABERTAS COM MAPA DA OFICINA' }));
    for (const s of L.slice(0, 12)) caixa.appendChild(h('div.ofi-sala-l', h('b', { texto: s.name }), h('small', { texto: '«' + s.mapa.nome + '» por ' + s.mapa.autor + ' · ' + s.players + '/' + s.max + (s.state === 'playing' ? ' · rolando' : '') }),
      s.state !== 'playing' && s.players < s.max ? botao('ENTRAR', () => mandaSala({ type: 'join', code: s.code, rapido: true }), 'ama') : null,
      botao('ASSISTIR', () => mandaSala({ type: 'join', code: s.code, spectate: true }), 'escuro')));
  };
  HU.salas = pinta; pinta();
  if (conectado()) mandaSala({ type: 'list' });
}
async function entraSalaCodigo() {
  const c = await pergunta('Entrar numa sala', 'O código da sala (6 letras e números):', '', 6); if (c == null) return;
  const code = String(c).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6); if (code.length < 4) return aviso('Confira o código da sala.');
  if (!(await conecta())) return aviso('Sem conexão com o servidor das salas agora.', 'erro');
  OFS.volta = OFI.tela || 'hub';
  mandaSala({ type: 'join', code, rapido: true });     // (entra num time com vaga, como o JOGAR AGORA; na sala dá para SÓ ASSISTIR)
}

/* ---------------------------------------------------------------- publicar */
async function publicaDialogo(reg, M) {
  if (!reg) return;
  if (OFE.aberto && OFE.reg === reg) { if (OFE.pend) confirmaMuda(); M = OFE.M; }
  const l = RM.limpa(M);
  if (!l.ok) { aviso('O mapa tem problemas: ' + (l.erros || []).slice(0, 2).join(' · '), 'erro'); if (OFE.aberto) { OFE.painelAberto = true; OFE.sel.clear(); OFE.aba = 'validar'; edEstado(); painelAtualiza(); } return; }
  if (!(await conecta())) return aviso('Sem conexão com o servidor das salas: publicar precisa da internet.', 'erro');
  const eu = await quemSou(true);                      // (agora: quantos públicos a pessoa já tem)
  M = l.mapa;
  const atualiza = !!reg.remoto;
  // (versão nova do mapa de outra pessoa — você é colaborador: o nome, a descrição, a categoria e a visibilidade são do criador)
  let criador = true;
  if (atualiza) { const a = await pede('abrir', { id: reg.remoto.id }); if (a && a.ok && a.meta && a.meta.meu) criador = !!(a.meta.meu.dono || a.meta.meu.staff); }
  const cheio = !atualiza && limitePublicosCheio(eu);
  let vis = cheio ? 'naoListado' : 'publico', copiaOk = true, cat = M.categoria, nome, desc, nota;
  const thumb = DES.miniatura(M, 320, 180) || DES.miniatura(M, 192, 108);
  const ok = await janela(atualiza ? 'Publicar versão nova' : 'Publicar mapa', c => {
    nome = h('input.ofi-in', { type: 'text', maxLength: RM.LIM.nome, value: M.nome }); desc = h('textarea.ofi-in', { maxLength: RM.LIM.descricao, rows: 3, placeholder: 'Como se joga, o que tem de especial…' }); desc.value = M.descricao || '';
    nota = h('input.ofi-in', { type: 'text', maxLength: 80, placeholder: 'O que mudou (opcional)' });
    if (!criador) { nome.disabled = true; desc.disabled = true; }
    poe(c, h('div.ofi-pub', h('div.ofi-pub-img', imgMapa(thumb)), h('div.ofi-pub-campos',
      fLinha('Nome', nome), fLinha('Descrição', desc),
      criador ? fSel('Categoria', cat, RM.CATEGORIAS.map(x => [x, N_CATEGORIA[x]]), v => { cat = v; }) : fLinha('Categoria', h('span', { texto: N_CATEGORIA[cat] || cat })),
      criador ? null : fNota('Você é colaborador deste mapa: publica a versão nova, mas o nome, a descrição, a categoria e a visibilidade são do criador.'),
      atualiza ? fLinha('Nota da versão', nota) : fSel('Visibilidade', vis, opcoesVisibilidade(cheio), v => { vis = v; }),
      atualiza ? fNota('A versão de agora vira a ' + ((reg.remoto.versao | 0) + 1) + '. Quem estiver jogando a antiga termina a partida nela; as versões antigas ficam guardadas no servidor.') : fNota(notaVisibilidade(eu, cheio)),
      atualiza ? null : fBool('Permitir que outros dupliquem (copiem) o mapa', copiaOk, v => { copiaOk = v; }),
      eu && !eu.conta ? fNota('Dica: entre na sua conta para o mapa ficar no seu nome em qualquer aparelho.') : null)));
  }, [{ rot: 'CANCELAR', v: null, cls: 'escuro' }, { rot: atualiza ? 'PUBLICAR VERSÃO' : 'PUBLICAR', cls: 'ama', valor: () => true }], 'ofi-jan-larga');
  if (!ok) return;
  const args = criador ? { mapa: M, nome: nome.value, descricao: desc.value, categoria: cat, thumb } : { mapa: M, thumb };
  if (atualiza) { args.id = reg.remoto.id; args.nota = nota.value; } else { args.visibilidade = vis; args.permiteCopiar = copiaOk; if (reg.origem) args.origem = reg.origem; }
  aviso('Publicando…');
  let r = await pede('publicar', args, 20000);
  if (!r.ok && atualiza && /não existe mais/.test(r.erro || '')) {
    if (await confirma('O mapa sumiu do servidor', 'O publicado foi apagado. Publicar este como um mapa novo (com outro código)?', 'PUBLICAR NOVO')) { delete args.id; args.visibilidade = limitePublicosCheio(eu) ? 'naoListado' : 'publico'; args.permiteCopiar = true; r = await pede('publicar', args, 20000); }
    else return;
  }
  if (r.publicos != null && HUB.eu) HUB.eu.publicos = r.publicos;
  if (!r.ok && r.codigo === 'publicos' && !args.id) {    // (os 3 públicos encheram — publicou de outro aparelho, por exemplo): vai como não listado?
    const v = await janela('Você já tem ' + (r.maxPublicos || 3) + ' mapas públicos', c => { c.appendChild(h('p.ofi-jan-tx', { texto: r.erro })); },
      [{ rot: 'CANCELAR', v: null, cls: 'escuro' }, { rot: 'PUBLICAR COMO PRIVADO', v: 'privado', cls: 'escuro' }, { rot: 'PUBLICAR COMO NÃO LISTADO', v: 'naoListado', cls: 'ama' }]);
    if (!v) return;
    args.visibilidade = v; r = await pede('publicar', args, 20000);
    if (r.publicos != null && HUB.eu) HUB.eu.publicos = r.publicos;
  }
  if (!r.ok) return janela('Não deu para publicar', c => { c.appendChild(h('p.ofi-jan-tx', { texto: r.erro || 'Tente de novo.' })); }, [{ rot: 'OK', v: null, cls: 'escuro' }]);
  const meta = r.meta;
  reg.remoto = { id: meta.id, codigo: meta.codigo, versao: meta.versao }; reg.publicado = Date.now(); reg.sujo = false;
  reg.nome = meta.nome; reg.mapa = JSON.parse(JSON.stringify(M)); reg.mapa.nome = meta.nome; reg.mapa.descricao = meta.descricao; reg.mapa.categoria = meta.categoria; reg.mapa.id = meta.id; reg.mapa.codigo = meta.codigo; reg.mapa.versao = meta.versao;
  if (OFE.aberto && OFE.reg === reg) { OFE.M = JSON.parse(JSON.stringify(reg.mapa)); recompila(); OFE.mudou = false; edEstado(); }
  await GAVETA.poe('mapas', reg);
  await GAVETA.novaVersao(reg.id, reg.mapa, 'publicado v' + meta.versao, false);
  janela(atualiza ? 'Versão ' + meta.versao + ' publicada!' : 'Mapa publicado!', c => {
    poe(c, h('p.ofi-jan-tx', { texto: meta.visibilidade === 'publico' ? 'Ele já aparece na comunidade. O código do mapa:' : 'Quem tiver o código abre o mapa:' }),
      h('div.ofi-pub-cod', h('button.ofi-codigo.grande', { type: 'button', on: { click: () => copiaAviso(meta.codigo, 'Código copiado') } }, icone('copiar'), h('b', { texto: meta.codigo }))),
      r.avisos && r.avisos.length ? fNota('Avisos: ' + r.avisos.slice(0, 3).join(' · ')) : null);
  }, [{ rot: 'FECHAR', v: null, cls: 'escuro' }, { rot: 'CRIAR SALA', cls: 'ama', v: 'jogar' }]).then(v => { if (v === 'jogar') criaSalaDialogo({ ref: { id: meta.id }, meta, volta: OFI.tela === 'editor' ? 'editor' : 'hub' }); });
}
