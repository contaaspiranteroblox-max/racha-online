'use strict';
/* RACHA v92 · OFICINA — o catálogo dos mapas e as salas com mapa no servidor das salas (server/mapas.js, server/turma.js,
   server/partida/sala_mapa.js). Sem navegador: as conexões são de mentira (o mesmo arnês do tests/servidor_test.js) e, no
   fim, uma conversa pela rede de verdade (o servidor numa porta livre, com a mensagem grande do mapa).
   Confere: publicar (validação, ritmo, limite), abrir por código, a lista (abas, busca, categorias), curtir, favoritar,
   denunciar (e o mapa saindo do catálogo), a moderação, os colaboradores e as permissões, o copiar, as versões, apagar,
   a miniatura, a gravação em disco (e o índice refeito), a sala com mapa (até 4 times, os lugares, a configuração, a
   partida no servidor, os quadros, o gol, o fim sem selo, quem cai e volta, o admin encerrando) e que a sala comum e a
   ranqueada continuam as mesmas. E (v92.1) o limite de 3 mapas PÚBLICOS por criador e a FÍSICA DA SALA (o admin escolhe
   ao criar a sala com mapa ou nos ajustes: vale só nela, o mapa publicado não muda). E (28/10, a revisão de segurança) a
   troca de mapa com ritmo próprio e sem trabalho à toa, o pedido recusado sem deixar a sala pela metade, as vagas sem bots, os
   números da pessoa (não da vaga), a mensagem grande com o "type" repetido, o mapa não listado na lista de salas e as falas
   de quem foi silenciado.
   Rodar: node tests/oficina_servidor_test.js */
const path = require('path');
const fs = require('fs');
const os = require('os');
const EventEmitter = require('events');
const RAIZ = path.resolve(__dirname, '..');
const {Turma} = require(path.join(RAIZ, 'server', 'turma'));
const {assina} = require(path.join(RAIZ, 'server', 'banco'));
const M = require(path.join(RAIZ, 'server', 'partida', 'mapa'));

let ok = 0, falhou = 0; const falhas = [];
function confira(cond, txt, extra){
  if (cond){ ok++; console.log('  ok   ' + txt); }
  else { falhou++; falhas.push(txt); console.log('  FALHOU ' + txt + (extra !== undefined ? '  → ' + JSON.stringify(extra).slice(0, 400) : '')); }
  return cond;
}
class WsFalso extends EventEmitter {
  constructor(){ super(); this.readyState = 1; this.bufferedAmount = 0; this.caixa = []; this.vivo = true; }
  send(t){ if (this.readyState === 1) this.caixa.push(JSON.parse(t)); return true; }
  close(){ if (this.readyState === 3) return; this.readyState = 3; this.emit('close'); }
  terminate(){ this.close(); }
  ping(){}
}
let relogio = 1.75e12;
const anda = ms => { relogio += ms; };
function novaTurma(o){ return new Turma(Object.assign({log:() => {}, agora:() => relogio, p2p:false, exigeConta:false, mapas:null}, o || {})); }
let ipN = 1;
function cliente(t, nome, req){
  const ws = new WsFalso();
  const c = t.conecta(ws, Object.assign({headers:{}, socket:{remoteAddress:'10.1.0.' + (ipN++ % 250)}}, req || {}));
  let rid = 0;
  const k = {ws, c, nome,
    manda: m => ws.emit('message', JSON.stringify(m)),
    ult: tipo => { for (let i = ws.caixa.length - 1; i >= 0; i--) if (ws.caixa[i].type === tipo) return ws.caixa[i]; return null; },
    todas: tipo => ws.caixa.filter(x => x.type === tipo),
    limpa: () => { ws.caixa.length = 0; },
    sala: () => { const r = k.ult('room'); return r && r.room; },
    pede: (op, args) => { const r = ++rid; c.baldes = {}; ws.emit('message', JSON.stringify({type:'mapa_req', rid:r, op, args})); return ws.caixa.find(x => x.type === 'mapa_res' && x.rid === r) || null; }};
  return k;
}
function entra(t, nome, extra){ const k = cliente(t, nome); k.manda(Object.assign({type:'hello', name:nome, skin:'', flag:'BR'}, extra || {})); const h = k.ult('hello'); k.id = h && h.id; k.token = h && h.token; k.pub = h && h.pub; return k; }

// os mapas de teste (o formato do jogo; o servidor limpa tudo)
const mapaBase = (o) => Object.assign({formato:'racha-mapa', v:1, nome:'Arena do Zé', descricao:'Campo de teste', categoria:'competitivo',
  campo:{w:71, h:50, margem:7.5, margemY:5}, partida:{equipes:2, porTime:2},
  objetos:[{id:'gA', tipo:'gol', x:-35.5, y:0, rot:180, largura:16, dono:0}, {id:'gB', tipo:'gol', x:35.5, y:0, rot:0, largura:16, dono:1}], logica:[]}, o || {});
const mapa4 = () => mapaBase({nome:'Quatro Gols', categoria:'criativo', campo:{forma:'quadrado', w:70, h:70}, partida:{equipes:4, porTime:1, porMin:1, porMax:2, meta:2},
  objetos:[{id:'g0', tipo:'gol', x:-35, y:0, rot:180, largura:14, dono:0}, {id:'g1', tipo:'gol', x:35, y:0, rot:0, largura:14, dono:1},
    {id:'g2', tipo:'gol', x:0, y:-35, rot:270, largura:14, dono:2}, {id:'g3', tipo:'gol', x:0, y:35, rot:90, largura:14, dono:3}]});
// uma miniatura de verdade (PNG 1×1) e uma falsa
const PNG = 'data:image/png;base64,' + Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000' + '1f15c4890000000d49444154789c6360f8cfc0f01f0005fe02fea7d6a5c20000000049454e44ae426082', 'hex').toString('base64');
const FALSA = 'data:image/png;base64,' + Buffer.from('<script>alert(1)</script>').toString('base64');

function catalogo(){
  console.log('\n1) o catálogo: publicar, abrir, a lista, curtir, favoritar');
  const t = novaTurma();
  const A = entra(t, 'Ana'), B = entra(t, 'Bia'), C = entra(t, 'Caio');
  let r = A.pede('publicar', {mapa:mapaBase(), visibilidade:'publico', thumb:PNG, permiteCopiar:true});
  confira(r && r.ok && /^[A-Z0-9]{7}$/.test(r.meta.codigo) && /^m[a-z0-9]+$/.test(r.meta.id) && r.meta.versao === 1 && r.meta.meu.dono, 'publicar: o mapa ganha id, código de 7 letras e a versão 1', r);
  const id = r.meta.id, codigo = r.meta.codigo;
  confira(r.meta.dono === undefined && !JSON.stringify(r).includes(A.id + '"'), 'a resposta não leva o id interno de quem criou');
  r = A.pede('publicar', {mapa:mapaBase({nome:'Outro'})});
  confira(r && !r.ok && /Calma/.test(r.erro), 'publicar de novo logo em seguida: espera uns segundos', r);
  anda(20000);
  r = A.pede('publicar', {mapa:{formato:'racha-mapa', v:1, objetos:[{id:'sb', tipo:'spawnBola', x:200, y:0}]}});
  confira(r && !r.ok && /problemas/.test(r.erro) && Array.isArray(r.erros), 'mapa com erro não é publicado (a lista dos erros volta)', r);
  r = A.pede('publicar', {mapa:'<script>'});
  confira(r && !r.ok, 'o que não é mapa é recusado');
  // a lista
  r = B.pede('lista', {aba:'recentes'});
  confira(r && r.ok && r.total === 1 && r.itens[0].codigo === codigo && r.itens[0].thumb === PNG && r.itens[0].autor === 'Ana', 'a lista mostra o mapa com a miniatura, o autor e o código', r && r.itens);
  confira(r.itens[0].meu && !r.itens[0].meu.dono && !r.itens[0].meu.curti, 'para a Bia: não é dela e ela ainda não curtiu');
  r = B.pede('curtir', {id, on:true}); confira(r && r.ok && r.curtidas === 1 && r.curti === true, 'curtir: 1 curtida');
  r = B.pede('curtir', {id, on:true}); confira(r && r.ok && r.curtidas === 1, 'curtir duas vezes não conta duas');
  r = C.pede('curtir', {codigo, on:true}); confira(r && r.ok && r.curtidas === 2, 'curtir pelo código também vale');
  r = B.pede('favorito', {id, on:true}); confira(r && r.ok && r.favoritos === 1, 'favoritar');
  r = B.pede('lista', {aba:'favoritos'}); confira(r && r.total === 1 && r.itens[0].meu.favorito && r.itens[0].meu.curti, 'a aba Favoritos da Bia tem o mapa (e o coração aceso)');
  r = C.pede('curtir', {id, on:false}); confira(r && r.curtidas === 1, 'descurtir');
  r = B.pede('abrir', {codigo:codigo.toLowerCase()});
  confira(r && r.ok && r.mapa && r.mapa.objetos.length === 2 && r.mapa.codigo === codigo && r.mapa.autor === 'Ana' && M.limpa(r.mapa).ok, 'abrir pelo código (minúsculo também): vem o mapa limpo, com código e autor', r && r.erro);
  r = B.pede('abrir', {codigo:'ZZZZZZZ'}); confira(r && !r.ok && /não encontrado/.test(r.erro), 'código que não existe: não encontrado');
  // a busca e as abas
  anda(20000); A.pede('publicar', {mapa:mapaBase({nome:'Labirinto da Vila', categoria:'minigame'}), visibilidade:'publico'});
  anda(20000); A.pede('publicar', {mapa:mapaBase({nome:'Treino de Chute', categoria:'treinamento'}), visibilidade:'naoListado'});
  r = C.pede('lista', {aba:'busca', busca:'labirinto'}); confira(r && r.total === 1 && r.itens[0].nome === 'Labirinto da Vila', 'a busca pelo nome acha (sem diferença de maiúscula)');
  r = C.pede('lista', {aba:'busca', busca:'ze'}); confira(r && r.total === 1 && r.itens[0].nome === 'Arena do Zé', 'a busca ignora o acento ("ze" acha "Zé")');
  r = C.pede('lista', {aba:'busca', busca:codigo}); confira(r && r.total === 1, 'a busca pelo código acha o mapa');
  r = C.pede('lista', {aba:'minigames'}); confira(r && r.total === 1 && r.itens[0].categoria === 'minigame', 'a categoria Minigames só tem os minigames');
  r = C.pede('lista', {aba:'recentes'}); confira(r && r.total === 2 && !r.itens.some(x => x.nome === 'Treino de Chute'), 'o mapa não listado não aparece no catálogo');
  const nl = A.pede('lista', {aba:'meus'}).itens.find(x => x.nome === 'Treino de Chute');
  r = C.pede('abrir', {codigo:nl.codigo}); confira(r && r.ok, '…mas abre pelo código (não listado)');
  r = C.pede('lista', {aba:'populares'}); confira(r && r.itens[0].nome === 'Arena do Zé', 'populares: o mais curtido/jogado primeiro');
  r = A.pede('lista', {aba:'meus'}); confira(r && r.total === 3, 'Meus mapas: os 3 da Ana (os não listados também)');
  return {t, A, B, C, id, codigo};
}

function permissoes(ctx){
  console.log('\n2) os colaboradores, as permissões, o copiar, as versões, a visibilidade e apagar');
  const {t, A, B, C, id} = ctx;
  anda(20000);
  let r = B.pede('publicar', {id, mapa:mapaBase({nome:'Arena da Bia'})});
  confira(r && !r.ok && /permissão/.test(r.erro), 'quem não é colaborador não publica versão nova do mapa dos outros', r);
  r = A.pede('colab', {id, pub:B.pub, perms:{editar:true, testar:true, publicar:true, duplicar:false}});
  confira(r && r.ok && r.meta.colaboradores.length === 1 && r.meta.colaboradores[0].publicar && r.meta.colaboradores[0].nome === 'Bia', 'o criador põe a Bia como colaboradora (pelo ID do cartão)', r);
  r = A.pede('colab', {id, pub:'0000000'}); confira(r && !r.ok, 'ID que não existe: o servidor avisa');
  r = B.pede('colab', {id, pub:C.pub, perms:{editar:true}}); confira(r && !r.ok && /criador/.test(r.erro), 'colaborador não escolhe colaborador');
  anda(20000);
  r = B.pede('publicar', {id, mapa:mapaBase({nome:'Arena do Zé', descricao:'Versão da Bia'}), nota:'mexi no meio'});
  confira(r && r.ok && r.meta.versao === 2 && r.meta.autor === 'Ana', 'a colaboradora publica a versão 2 (o mapa continua da Ana)', r);
  r = A.pede('versoes', {id}); confira(r && r.ok && r.versoes.length === 2 && r.versoes[0].versao === 2 && r.versoes[0].nota === 'mexi no meio' && r.versoes[0].por === 'Bia', 'as versões: a 2 (da Bia, com a nota) e a 1', r);
  r = A.pede('abrir', {id, versao:1}); confira(r && r.ok && r.versao === 1 && r.mapa.descricao === 'Campo de teste', 'o criador abre a versão antiga');
  r = C.pede('abrir', {id, versao:1}); confira(r && !r.ok, 'quem não edita não abre a versão antiga');
  r = C.pede('versoes', {id}); confira(r && !r.ok, '…nem vê a lista das versões');
  anda(20000);
  r = B.pede('publicar', {id, mapa:mapaBase({nome:'Hackeado'}), nome:'Hackeado', visibilidade:'privado', categoria:'treino'});
  confira(r && r.ok && r.meta.versao === 3 && r.meta.nome === 'Arena do Zé' && r.meta.visibilidade === 'publico' && r.meta.categoria === 'competitivo', 'a colaboradora publica a versão 3, mas o nome, a categoria e a visibilidade continuam os do criador', r && r.meta);
  // copiar
  r = A.pede('config', {id, campos:{permiteCopiar:false}}); confira(r && r.ok && r.meta.permiteCopiar === false, 'o criador desliga o "permitir copiar"');
  r = C.pede('abrir', {id}); confira(r && r.ok && r.meta.meu.duplicar === false, 'para os outros, o mapa não pode ser duplicado');
  anda(20000);
  r = C.pede('publicar', {mapa:mapaBase({nome:'Cópia'}), origem:id}); confira(r && !r.ok && /não deixa copiar/.test(r.erro), 'publicar uma cópia de mapa que não deixa copiar é recusado', r);
  A.pede('config', {id, campos:{permiteCopiar:true}});
  anda(20000);
  r = C.pede('publicar', {mapa:mapaBase({nome:'Cópia do Caio'}), origem:id}); confira(r && r.ok && r.meta.origem === id, 'com "permitir copiar" ligado, a cópia é publicada (e lembra a origem)');
  const copia = r.meta.id;
  // privado
  r = A.pede('config', {id, campos:{visibilidade:'privado'}}); confira(r && r.ok && r.meta.visibilidade === 'privado', 'o criador deixa o mapa privado');
  r = C.pede('abrir', {id}); confira(r && !r.ok && /privado/.test(r.erro), 'privado: quem não é do mapa não abre', r);
  r = B.pede('abrir', {id}); confira(r && r.ok, '…a colaboradora abre');
  r = C.pede('lista', {aba:'recentes'}); confira(r && !r.itens.some(x => x.id === id), 'privado não aparece no catálogo');
  r = B.pede('lista', {aba:'compartilhados'}); confira(r && r.total === 1 && r.itens[0].id === id, 'Compartilhados comigo: a Bia vê o mapa da Ana');
  A.pede('config', {id, campos:{visibilidade:'publico'}});
  // apagar
  r = A.pede('apagar', {id:copia}); confira(r && !r.ok, 'ninguém apaga o mapa dos outros');
  r = C.pede('apagar', {id:copia}); confira(r && r.ok, 'o criador apaga o próprio mapa');
  r = C.pede('abrir', {id:copia}); confira(r && !r.ok, 'o mapa apagado sumiu');
  // a miniatura
  anda(20000);
  r = A.pede('publicar', {mapa:mapaBase({nome:'Sem foto'}), thumb:FALSA});
  const sf = A.pede('lista', {aba:'meus'}).itens.find(x => x.nome === 'Sem foto');
  confira(r && r.ok && sf && sf.thumb === '', 'a miniatura que não é imagem de verdade é jogada fora (o mapa entra sem foto)');
  // o limite de mapas por pessoa
  const D = entra(t, 'Dani'); let n = 0, err = '';
  for (let i = 0; i < 40; i++){ anda(20000); if (i % 12 === 11) anda(864e5); const x = D.pede('publicar', {mapa:mapaBase({nome:'D' + i}), visibilidade:i < 3 ? 'publico' : 'naoListado'}); if (x && x.ok) n++; else err = x && x.erro; }
  confira(n === 30 && /30 mapas/.test(err), 'cada pessoa guarda no máximo 30 mapas no servidor', [n, err]);
  return ctx;
}

function denuncias(ctx){
  console.log('\n3) as denúncias e a moderação');
  const {t, A, codigo, id} = ctx;
  const gente = []; for (let i = 0; i < 5; i++) gente.push(entra(t, 'Den' + i));
  // (de confiança: quem joga aqui sem conta há mais de 24 h e já jogou 3 partidas — as denúncias delas tiram o mapa sozinhas)
  for (const g of gente) { const x = t.b.d.gente[g.id]; x.criado = Date.now() - 25 * 3600e3; x.st.jogos = 3; }
  let r = A.pede('denunciar', {id, motivo:'ofensivo', texto:'meu próprio'}); confira(r && !r.ok, 'quem criou não denuncia o próprio mapa');
  r = gente[0].pede('denunciar', {id, motivo:'ofensivo', texto:'nome feio'}); confira(r && r.ok && r.nova && !r.oculto, 'a denúncia é anotada');
  r = gente[0].pede('denunciar', {id, motivo:'spam'}); confira(r && r.ok && !r.nova, 'a mesma pessoa denunciando de novo não conta');
  for (let i = 1; i < 4; i++) gente[i].pede('denunciar', {id, motivo:'copia'});
  r = gente[4].pede('lista', {aba:'busca', busca:codigo}); confira(r && r.total === 1, 'com 4 denúncias o mapa continua no catálogo');
  r = gente[4].pede('denunciar', {codigo, motivo:'quebrado', texto:'trava'}); confira(r && r.ok && r.oculto, 'a 5ª pessoa: o mapa sai do catálogo até a equipe olhar');
  r = gente[0].pede('lista', {aba:'populares'}); confira(r && !r.itens.some(x => x.id === id), 'o mapa em análise não aparece no catálogo');
  r = gente[0].pede('abrir', {id}); confira(r && !r.ok && /análise/.test(r.erro), 'e não abre para os outros (em análise)');
  r = A.pede('lista', {aba:'meus'}); const meu = r.itens.find(x => x.id === id);
  confira(meu && meu.estado === 'oculto' && meu.denuncias === 5, 'o criador vê o mapa dele em análise, com as 5 denúncias');
  r = gente[0].pede('moderar', {id, acao:'restaurar'}); confira(r && !r.ok, 'quem não é da equipe não modera');
  r = gente[0].pede('fila'); confira(r && !r.ok, '…nem vê a fila de denúncias');
  // a equipe: um moderador pela lista (RACHA_MODERADORES) e o selo 'equipe' (com a conta)
  t.moderadores.add(gente[1].id);
  r = gente[1].pede('fila'); confira(r && r.ok && r.itens.length >= 1 && r.itens[0].id === id && r.itens[0].lista.length === 5, 'a equipe vê a fila: o mapa e as denúncias com o motivo', r && r.itens && r.itens[0]);
  r = gente[1].pede('moderar', {id, acao:'limpar'}); confira(r && r.ok && r.meta.estado === 'ok' && r.meta.denuncias === 0, 'a equipe limpa as denúncias: o mapa volta');
  // quem abre conexões sem o token do aparelho vira "uma pessoa nova" a cada vez: 5 delas não tiram o mapa (vão para a fila)
  const novos = []; for (let i = 0; i < 5; i++) novos.push(entra(t, 'Novo' + i));
  for (const g of novos) g.pede('denunciar', {id, motivo:'ofensivo', texto:'de novo'});
  r = A.pede('abrir', {id});
  confira(r && r.ok && r.meta.estado === 'ok' && r.meta.denuncias === 5, '5 visitantes que acabaram de chegar (sem conta, sem 24 h e 3 partidas) denunciando: ficam anotadas (o criador vê 5), mas o mapa continua no catálogo', r && r.meta);
  r = gente[1].pede('fila'); confira(r && r.ok && r.itens.some(x => x.id === id), 'e o mapa aparece na fila da equipe');
  gente[1].pede('moderar', {id, acao:'limpar'});
  r = gente[1].pede('moderar', {id, acao:'oficial'}); confira(r && r.ok && r.meta.oficial, 'a equipe marca como oficial');
  r = gente[2].pede('lista', {aba:'oficiais'}); confira(r && r.total === 1 && r.itens[0].id === id, 'a aba Oficiais mostra o mapa');
  gente[1].pede('moderar', {id, acao:'destaque'});
  r = gente[2].pede('lista', {aba:'escolha'}); confira(r && r.total === 1, 'Escolha da comunidade (destaque da equipe)');
  r = gente[1].pede('moderar', {id, acao:'ocultar'}); confira(r && r.ok && r.meta.estado === 'oculto', 'a equipe oculta o mapa');
  r = gente[1].pede('moderar', {id, acao:'restaurar'}); confira(r && r.ok && r.meta.estado === 'ok', 'e restaura');
  const srv = new Turma({log:() => {}, agora:() => relogio, p2p:false, exigeConta:false, mapas:null, segredo:'s3gr3d0'});
  const eq = entra(srv, 'Equipe', {conta:assina('s3gr3d0', {p:'7', n:'Equipe', s:['equipe']})});
  const dono = entra(srv, 'Dono', {conta:assina('s3gr3d0', {p:'1', n:'Dono'})});
  confira(eq.pede('eu').staff === true && dono.pede('eu').staff === true && entra(srv, 'X').pede('eu').staff === false, 'a equipe pelo selo da conta e o Dono (000001) moderam; os outros não');
  srv.fecha();
  // a denúncia vai para a plataforma (o mesmo caminho das denúncias do chat)
  const recebidas = [];
  const comPlat = new Turma({log:() => {}, agora:() => relogio, p2p:false, exigeConta:false, mapas:null, segredo:'s3', denuncia:d => { recebidas.push(d); }});
  const a2 = entra(comPlat, 'A2', {conta:assina('s3', {p:'44', n:'A2'})}), b2 = entra(comPlat, 'B2', {conta:assina('s3', {p:'45', n:'B2'})});
  const pm = a2.pede('publicar', {mapa:mapaBase({nome:'Mapa A2'})});
  b2.pede('denunciar', {id:pm.meta.id, motivo:'ofensivo', texto:'nome ruim'});
  return new Promise(res => setTimeout(() => {
    confira(recebidas.length === 1 && recebidas[0].canal === 'mapa' && recebidas[0].alvo === '000044' && recebidas[0].autor === '000045' && /Mapa .* «Mapa A2»/.test(recebidas[0].texto), 'a denúncia do mapa também vai para a plataforma (RACHA CONTROL), contra a conta do criador', recebidas);
    comPlat.fecha(); res(ctx);
  }, 30));
}

function disco(){
  console.log('\n4) gravado em disco: curtidas, favoritos, denúncias e versões continuam depois de reiniciar');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'racha-mapas-'));
  const arquivo = path.join(dir, 'turma.json');          // (os tokens de quem joga sem conta também ficam guardados: a mesma pessoa volta)
  let t = novaTurma({mapas:dir, arquivo});
  const A = entra(t, 'Ana'), B = entra(t, 'Bia'), C = entra(t, 'Caio');
  const p = A.pede('publicar', {mapa:mapaBase(), thumb:PNG}); const id = p.meta.id;
  anda(20000); A.pede('publicar', {id, mapa:mapaBase({descricao:'v2'})});
  B.pede('curtir', {id, on:true}); C.pede('curtir', {id, on:true}); B.pede('favorito', {id, on:true}); C.pede('denunciar', {id, motivo:'spam', texto:'teste'});
  t.fecha();
  confira(fs.existsSync(path.join(dir, 'indice.json')) && fs.existsSync(path.join(dir, 'm', id + '.json')) && fs.existsSync(path.join(dir, 't', id + '.txt')), 'a pasta tem o índice, o arquivo do mapa e a miniatura');
  confira(!fs.readdirSync(dir).some(f => f.endsWith('.tmp')) && !fs.readdirSync(path.join(dir, 'm')).some(f => f.endsWith('.tmp')), 'nenhum arquivo temporário sobrou (a gravação é atômica)');
  t = novaTurma({mapas:dir, arquivo});
  const B2 = entra(t, 'Bia', {token:B.token}), A2 = entra(t, 'Ana', {token:A.token});
  let r = B2.pede('abrir', {id});
  confira(r && r.ok && r.meta.curtidas === 2 && r.meta.favoritos === 1 && r.meta.meu.curti && r.meta.meu.favorito && r.meta.versao === 2 && r.meta.thumb === PNG, 'depois de reiniciar: 2 curtidas, o favorito da Bia, a versão 2 e a miniatura', r && r.meta);
  r = A2.pede('lista', {aba:'meus'}); confira(r && r.itens[0].denuncias === 1, 'a denúncia também ficou guardada');
  r = A2.pede('versoes', {id}); confira(r && r.ok && r.versoes.length === 2, 'as duas versões ficaram guardadas');
  t.fecha();
  // a queda logo depois de publicar (o índice espera 1 s para gravar): o mapa novo está no arquivo e volta para o índice ao abrir
  t = novaTurma({mapas:dir, arquivo});
  const A4 = entra(t, 'Ana', {token:A.token}); anda(20000);
  const p2 = A4.pede('publicar', {mapa:mapaBase({nome:'Depois do índice'})});
  clearTimeout(t.mapas.timer); t.mapas.timer = null; t.mapas.sujo = false;   // (o processo "caiu": o índice não gravou)
  t = novaTurma({mapas:dir, arquivo});
  r = entra(t, 'Bia', {token:B.token}).pede('abrir', {codigo:p2.meta && p2.meta.codigo});
  confira(p2.ok && r && r.ok && r.meta.nome === 'Depois do índice', 'o servidor caiu antes de gravar o índice: o mapa novo (que estava no arquivo) volta para o índice', r && (r.meta || r.erro));
  t.fecha();
  // o índice estragado: refeito a partir dos arquivos dos mapas (e das curtidas da cópia de segurança)
  fs.writeFileSync(path.join(dir, 'indice.json'), '{isso não é json');
  t = novaTurma({mapas:dir, arquivo});
  const B3 = entra(t, 'Bia', {token:B.token});
  r = B3.pede('abrir', {id});
  confira(r && r.ok && r.meta.nome === 'Arena do Zé' && r.meta.curtidas === 2, 'o índice estragado é refeito dos arquivos (e as curtidas vêm da cópia de segurança)', r && (r.meta || r.erro));
  confira(fs.readdirSync(dir).some(f => f.startsWith('indice.json.estragado-')), 'o índice estragado foi guardado à parte (nada se perde)');
  t.fecha();
  fs.rmSync(dir, {recursive:true, force:true});
}

function salas(){
  console.log('\n5) a sala com mapa: até 4 times, os lugares, a partida no servidor e o fim sem selo');
  const t = novaTurma({segredo:'s3gr3d0'});
  const A = entra(t, 'Ana', {conta:assina('s3gr3d0', {p:'10', n:'Ana'})}), B = entra(t, 'Bia', {conta:assina('s3gr3d0', {p:'11', n:'Bia'})}), C = entra(t, 'Caio'), D = entra(t, 'Dani');
  const pub = A.pede('publicar', {mapa:mapa4(), visibilidade:'publico'}); const id = pub.meta.id, codigo = pub.meta.codigo;
  A.limpa();
  A.manda({type:'create', mapa:{codigo}, bots:true, n:1});
  const iMapa = A.ws.caixa.findIndex(x => x.type === 'mapa_sala'), iRoom = A.ws.caixa.findIndex(x => x.type === 'room');
  let sala = A.sala();
  confira(iMapa >= 0 && iRoom > iMapa, 'quem cria recebe o mapa da sala (mapa_sala) antes da tela dela');
  const ms = A.ult('mapa_sala');
  confira(ms && ms.mapa.partida.equipes === 4 && ms.info.codigo === codigo && ms.hash && ms.hash === ms.info.hash, 'o mapa_sala leva o mapa limpo, o código e o hash');
  confira(sala && sala.E === 4 && sala.roster.length === 4 && sala.mapa && sala.mapa.nome === 'Quatro Gols' && sala.n === 1 && sala.pub, 'a sala tem 4 times (roster de 4), o nome do mapa e é aberta', sala);
  B.manda({type:'join', code:sala.code});
  confira(!!B.ult('mapa_sala') && B.ult('mapa_sala').code === sala.code, 'quem entra recebe o mapa da sala');
  B.manda({type:'seat', team:3}); sala = A.sala();
  confira(sala.roster[3] === B.id, 'a Bia senta no Time D (o 4º time)');
  B.manda({type:'seat', team:4}); confira(A.sala().roster[3] === B.id, 'time 5 não existe: nada muda');
  C.manda({type:'join', code:sala.code, rapido:true}); sala = A.sala();
  confira(sala.roster.indexOf(C.id) === 1, 'JOGAR AGORA põe o Caio no time com menos gente (o B, vazio)', sala.roster);
  A.manda({type:'config', n:2}); sala = A.sala();
  confira(sala.n === 2 && sala.roster.length === 8 && sala.roster[0] === A.id && sala.roster[2] === C.id && sala.roster[6] === B.id, 'o admin muda para 2 por time: cada um continua no seu time', sala.roster);
  A.manda({type:'config', n:3}); confira(A.sala().n === 2, 'mais que o máximo do mapa (porMax 2): não muda');
  let lista = null; D.manda({type:'list'}); lista = D.ult('rooms');
  const item = lista && lista.list.find(x => x.code === sala.code);
  confira(item && item.mapa && item.mapa.nome === 'Quatro Gols' && item.E === 4 && item.max === 8, 'a lista das salas mostra o mapa, os 4 times e o máximo de 8', item);
  // começa: a partida no mapa, no servidor
  A.limpa(); B.limpa();
  A.manda({type:'start'});
  const r = t.salaDe(A.c);
  confira(r.partida && r.partida.constructor.name === 'PartidaMapa' && r.partida.E === 4 && A.ult('start'), 'começou: a partida no mapa (PartidaMapa) roda no servidor');
  r.partida.desligar();                                // (o teste anda o motor na mão)
  for (let s = 1; s <= 120; s++){ anda(1000/60); A.manda({type:'input', seq:s, x:1, y:0, button:1}); r.partida.passo(); }
  const snap = A.ult('snapshot');
  confira(snap && snap.data.sc.length === 4 && snap.data.p.length === 8 && Array.isArray(snap.data.b) && snap.round === r.round, 'os quadros chegam com o placar dos 4 times e as 8 vagas', snap && snap.data);
  const qa = r.partida.jog[0];
  confira(qa.netId === A.id && qa.ack49 > 100 && qa.x !== 0, 'o comando da Ana anda com a tampinha dela (ack ' + qa.ack49 + ')');
  confira(r.partida.jog[1].vazio && !r.partida.jog[1].bot && r.partida.jog[4].vazio && !r.partida.jog[4].bot, 'as vagas sem gente ficam vazias (v103: as salas personalizadas não têm bots)');
  // o gol: a Ana chuta no gol do time B (o g1, à direita)
  const P = r.partida.P, g = P.G.gols[1]; P.estado = 'jogo';
  for (const q of P.jog) if (q !== qa) { q.x = P.G.GL + 40 + q.i * 40; q.y = P.G.GT + 40; q.bot = null; q.ai = null; }
  P.B.x = g.cx - 200; P.B.y = g.cy; P.B.vx = P.B.vy = 0; qa.x = P.B.x - (qa.r + P.C.R_BOLA + 2); qa.y = g.cy;
  P.chuta(qa, P.C.FORCA_POWER);
  for (let i = 0; i < 40; i++){ anda(1000/60); r.partida.passo(); }
  confira(P.placar.join() === '1,0,0,0' && r.gols[A.id] === 1, 'gol da Ana no gol do Time B: ponto do Time A (o servidor anotou o autor)', [P.placar, r.gols]);
  // a Bia cai no meio da partida: a vaga fica vazia (v103: sem bots); ela volta para o mesmo lugar
  const iB = r.roster.indexOf(B.id);
  B.ws.close();
  confira(!P.jog[iB].bot && P.jog[iB].vazio && P.jog[iB].fora && !P.jog[iB].netId && P.jog[iB].reserva === B.id, 'a Bia caiu: a vaga dela fica vazia na hora (v103: sem bot no lugar) e guardada para ela');
  const B2 = cliente(t, 'Bia'); B2.manda({type:'hello', name:'Bia', conta:assina('s3gr3d0', {p:'11', n:'Bia'})});
  B2.manda({type:'join', code:r.code, slot:iB});
  confira(P.jog[iB].netId === B.id && !P.jog[iB].bot && !P.jog[iB].fora && !!B2.ult('mapa_sala') && !!B2.ult('start'), 'ela volta: a tampinha dela volta ao campo e ela recebe o mapa e o começo da partida', [P.jog[iB].netId, !!B2.ult('mapa_sala'), !!B2.ult('start')]);
  // a conexão nova chega antes de a velha cair (outra aba, o celular trocando de rede): continua UMA tampinha só, a mesma
  for (const q of P.jog) if (!q.netId && !q.bot) M.botAssume(P, q);   // (as vagas sem gente voltam a ser bots: há vaga de bot para tomar)
  const B3 = cliente(t, 'Bia'); B3.manda({type:'hello', name:'Bia', conta:assina('s3gr3d0', {p:'11', n:'Bia'})});
  const suas = P.jog.filter(q => q.netId === B.id).map(q => q.i);
  confira(suas.length === 1 && suas[0] === iB, 'a Bia abre de novo com a outra ainda aberta: continua com uma tampinha só, a dela (não toma a vaga de um bot)', suas);
  // o fim: meta 2
  P.estado = 'jogo'; P.placar[0] = 1; P.B.x = g.cx - 200; P.B.y = g.cy; P.B.vx = P.B.vy = 0; qa.x = P.B.x - (qa.r + P.C.R_BOLA + 2); qa.y = g.cy; P.toques.length = 0;
  anda(40000);
  P.chuta(qa, P.C.FORCA_POWER);
  for (let i = 0; i < 400 && r.state === 'playing'; i++){ anda(1000/60); if (r.partida) r.partida.passo(); }
  const res = A.ult('result');
  confira(res && res.custom && res.oficial === false && res.valida && res.winner === 0 && res.score.join() === '2,0,0,0' && !res.selo, 'fim: o resultado vale na sala, com o vencedor, mas SEM selo (sem XP, patente nem troféu)', res);
  confira(res && res.jog && res.jog.find(j => j.id === A.id).gols === 2, 'o resultado traz quem fez os gols');
  confira(t.mapas.d.mapas[id].jogos === 3, 'a partida conta como jogada no mapa (uma por pessoa que jogou)', t.mapas.d.mapas[id].jogos);
  confira(!t.b.d.gente[A.id] || !(t.b.d.gente[A.id].st && t.b.d.gente[A.id].st.jogos), 'os números oficiais da turma (troféus) não mudam com o mapa personalizado');
  // a revanche e o admin encerrando
  A.manda({type:'rematch'});
  const r2 = t.salaDe(A.c); r2.partida.desligar();
  for (let i = 0; i < 30; i++){ anda(1000/60); r2.partida.passo(); }
  B2.manda({type:'mapa_encerrar'}); confira(r2.state === 'playing', 'quem não é admin não encerra');
  A.manda({type:'mapa_encerrar'});
  const res2 = A.ult('result');
  confira(r2.state === 'ended' && res2 && res2.valida === false && res2.motivo === 'encerrada pelo admin' && !r2.partida, 'o admin encerra a partida no mapa: acaba na hora e o resultado não vale', res2);
  // trocar o mapa da sala (o rascunho do editor) e voltar para os campos do RACHA
  A.manda({type:'config', mapaDados:mapaBase({nome:'Rascunho', partida:{equipes:3, porTime:1}})});
  sala = A.sala();
  confira(sala.E === 3 && sala.roster.length === 3 && sala.mapa.rascunho && !sala.pub && A.ult('mapa_sala').info.rascunho, 'o admin troca para o rascunho do editor: 3 times e a sala fecha (rascunho é privado)', sala);
  A.manda({type:'config', semMapa:true}); sala = A.sala();
  confira(!sala.mapa && sala.E === 2 && sala.roster.length === 2 * sala.n, 'e volta para os campos do RACHA (2 times)');
  t.fecha();
}

function privado(){
  console.log('\n6) o mapa privado e o rascunho nas salas; a sala comum e a ranqueada continuam iguais');
  const t = novaTurma();
  const A = entra(t, 'Ana'), B = entra(t, 'Bia'), C = entra(t, 'Caio');
  const p = A.pede('publicar', {mapa:mapaBase({nome:'Segredo'}), visibilidade:'privado'});
  C.manda({type:'create', mapa:{id:p.meta.id}});
  confira(C.ult('error') && /privado/.test(C.ult('error').message) && !C.sala(), 'quem não é do mapa privado não abre sala com ele');
  A.manda({type:'create', mapa:{id:p.meta.id}, pub:true});
  confira(A.sala() && A.sala().pub === false && A.sala().mapa.privado, 'a sala com mapa privado é sempre fechada (não aparece na lista)');
  A.pede('colab', {id:p.meta.id, pub:B.pub, perms:{testar:true}});
  B.manda({type:'create', mapa:{id:p.meta.id}});
  confira(B.sala() && B.sala().mapa.id === p.meta.id, 'a colaboradora com "testar" abre sala com o mapa privado');
  C.manda({type:'create', mapaDados:{formato:'racha-mapa', v:1, objetos:[{id:'sb', tipo:'spawnBola', x:500, y:0}]}});
  confira(C.ult('error') && /problemas/.test(C.ult('error').message), 'o rascunho com erro não vira sala');
  C.manda({type:'create', mapaDados:mapaBase({nome:'Meu teste'})});
  confira(C.sala() && C.sala().mapa.rascunho && C.sala().pub === false, 'o rascunho do editor vira sala fechada (o TESTE MULTIPLAYER)');
  // a sala comum
  const D = entra(t, 'Dani');
  D.manda({type:'create', n:2, jogo:'futebol', bots:true});
  { const E2 = entra(t, 'Edu'); E2.manda({type:'join', code:D.sala().code, slot:2}); }   // (v103: sem bots, o outro time precisa de alguém)
  const s = D.sala();
  confira(s && !s.mapa && s.E === 2 && s.roster.length === 4, 'a sala comum continua igual (2 times, sem mapa)');
  D.manda({type:'start'});
  const r = t.salaDe(D.c);
  confira(r.partida && r.partida.constructor.name === 'PartidaSala', 'e a partida dela é a PartidaSala de sempre (a física oficial)');
  // a mensagem grande (o mapa com muitos objetos) passa só para o mapa
  const objs = []; for (let i = 0; i < 150; i++) objs.push({id:'d' + i, tipo:'decoracao', forma:'poligono', x:(i % 15) * 4 - 30, y:Math.floor(i / 15) * 4 - 20, nome:'enfeite número ' + i,
    pontos:Array.from({length:48}, (_, k) => [Math.round(Math.cos(k / 48 * 6.283) * 137) / 100, Math.round(Math.sin(k / 48 * 6.283) * 113) / 100])});
  const grande = mapaBase({nome:'Grandão', objetos:mapaBase().objetos.concat(objs), descricao:'x'.repeat(250)});
  const txt = JSON.stringify({type:'mapa_req', rid:99, op:'publicar', args:{mapa:grande}});
  confira(txt.length > 65536, 'o pedido de publicar o mapa grande tem ' + Math.round(txt.length / 1024) + ' KB');
  anda(20000); B.c.baldes = {}; B.ws.emit('message', txt);
  const rg = B.ws.caixa.find(x => x.type === 'mapa_res' && x.rid === 99);
  confira(rg && rg.ok, 'a mensagem grande do mapa passa (até 400 KB, só para o mapa)', rg && rg.erro);
  const outra = JSON.stringify({type:'say', text:'x'.repeat(70000)}); const antes = B.ws.caixa.length; B.ws.emit('message', outra);
  confira(B.ws.caixa.length === antes, 'as outras mensagens grandes continuam recusadas');
  t.fecha();
}

function publicosEFisica(){
  console.log('\n8) no máximo 3 mapas públicos por criador; a física da sala (o tamanho da bola, os chutes…) só na sala');
  const t = novaTurma();
  const E = entra(t, 'Edu'), F = entra(t, 'Fê'), S = entra(t, 'Staff');
  const pub = (k, o) => { anda(20000); return k.pede('publicar', Object.assign({mapa:mapaBase({nome:'M' + Math.random().toString(36).slice(2, 6)})}, o)); };
  let r = E.pede('eu');
  confira(r && r.ok && r.publicos === 0 && r.maxPublicos === 3, 'o "eu" diz quantos mapas públicos a pessoa tem (0 de 3)', r);
  const ids = [];
  for (let i = 0; i < 3; i++){ r = pub(E, {visibilidade:'publico'}); if (r && r.ok) ids.push(r.meta.id); }
  confira(ids.length === 3 && r.publicos === 3 && r.maxPublicos === 3, 'publica 3 mapas públicos (a resposta traz o contador: 3 de 3)', r);
  r = pub(E, {visibilidade:'publico'});
  confira(r && !r.ok && r.codigo === 'publicos' && /3 mapas públicos/.test(r.erro) && r.publicos === 3, 'o 4º público é recusado, com o motivo e o contador', r);
  r = pub(E, {}); confira(r && !r.ok && r.codigo === 'publicos', 'sem dizer a visibilidade (o padrão é público): também é recusado');
  const nl = pub(E, {visibilidade:'naoListado'}), pv = pub(E, {visibilidade:'privado'});
  confira(nl && nl.ok && pv && pv.ok && pv.publicos === 3, 'não listado e privado não contam: publicam normalmente', [nl && nl.erro, pv && pv.erro]);
  r = pub(E, {id:ids[0], mapa:mapaBase({nome:'Versão 2'})});
  confira(r && r.ok && r.meta.versao === 2 && r.meta.visibilidade === 'publico', 'a versão nova de um que já é público não conta de novo', r && r.erro);
  r = E.pede('config', {id:nl.meta.id, campos:{visibilidade:'publico', nome:'Não pode mudar'}});
  const ab = E.pede('abrir', {id:nl.meta.id});
  confira(r && !r.ok && r.codigo === 'publicos' && ab.meta.visibilidade === 'naoListado' && ab.meta.nome !== 'Não pode mudar', 'trocar um não listado para público com 3 públicos: recusado (e nada muda, nem o nome)', r);
  r = pub(E, {id:nl.meta.id, visibilidade:'publico'});
  confira(r && !r.ok && r.codigo === 'publicos', 'publicar a versão nova de um não listado como público: também recusado');
  r = E.pede('config', {id:ids[1], campos:{visibilidade:'naoListado'}});
  confira(r && r.ok && r.publicos === 2, 'deixar um público como não listado abre a vaga (2 de 3)', r);
  r = E.pede('config', {id:nl.meta.id, campos:{visibilidade:'publico'}});
  confira(r && r.ok && r.meta.visibilidade === 'publico' && r.publicos === 3, 'e aí o outro vira público', r);
  r = E.pede('lista', {aba:'meus'});
  confira(r && r.ok && r.publicos === 3 && r.maxPublicos === 3 && r.itens.length === 5, 'a aba Meus mapas traz o contador dos públicos (3 de 3)', r && [r.publicos, r.itens.length]);
  r = F.pede('lista', {aba:'recentes'});
  confira(r && r.ok && r.publicos === undefined && r.total === 3, 'a comunidade mostra os 3 públicos do Edu (e não leva o contador)', r && r.total);
  r = E.pede('apagar', {id:ids[2]});
  confira(r && r.ok && r.publicos === 2, 'apagar um público: a vaga volta (2 de 3)', r);
  r = pub(E, {visibilidade:'publico'}); confira(r && r.ok, 'e o Edu publica outro público');
  r = pub(E, {visibilidade:'publico'}); confira(r && !r.ok && r.codigo === 'publicos', '…mas não o 4º de novo');
  r = E.pede('moderar', {id:ids[0], acao:'remover'}); confira(r && !r.ok, '(o Edu não modera)');
  t.moderadores.add(S.id);
  let n = 0; for (let i = 0; i < 5; i++){ r = pub(S, {visibilidade:'publico'}); if (r && r.ok) n++; }
  confira(n === 5, 'a equipe do RACHA não tem o limite (5 públicos)', r && r.erro);
  r = S.pede('moderar', {id:ids[0], acao:'remover'});
  r = E.pede('eu'); confira(r && r.publicos === 2, 'o mapa removido pela moderação não conta mais (2 de 3)', r && r.publicos);

  // a física da sala
  anda(20000);
  const m = F.pede('publicar', {mapa:mapa4(), visibilidade:'publico'}), codigo = m.meta.codigo;
  F.limpa(); F.manda({type:'create', mapa:{codigo}, bots:true, n:1});
  const h0 = F.ult('mapa_sala').hash, fis0 = JSON.stringify(F.ult('mapa_sala').mapa.fisica);
  confira(F.sala() && F.sala().mapa.fisicaSala === null, 'a sala com mapa sem física da sala: a do mapa (fisicaSala null)');
  F.manda({type:'leave'});
  anda(10000); F.c.baldes = {}; F.limpa();
  F.manda({type:'create', mapa:{codigo}, bots:true, n:1, fisicaSala:{preset:'personalizado', perfil:{rBola:1.5, forcaChute:520, velJog:99}, extra:{}, colideParedes:true}});
  let ms = F.ult('mapa_sala'), sala = F.sala();
  confira(ms && ms.mapa.fisica.preset === 'personalizado' && ms.mapa.fisica.perfil.rBola === 1.5 && ms.mapa.fisica.perfil.forcaChute === 520, 'criar a sala com a física da sala: o mapa da sala vem com a bola maior e o chute mais forte', ms && ms.mapa.fisica);
  confira(ms.mapa.fisica.perfil.velJog === 24, 'o que passa do limite é cortado (a velocidade da tampinha 99 → 24, o teto do núcleo)', ms.mapa.fisica.perfil.velJog);
  confira(ms.hash !== h0 && ms.hash === ms.info.hash && sala.mapa.hash === ms.hash && sala.mapa.fisicaSala && sala.mapa.fisicaSala.perfil.rBola === 1.5, 'o hash muda (o aparelho sabe que é outro mapa) e a sala mostra a física dela', [ms.hash, h0]);
  const ab2 = F.pede('abrir', {codigo});
  confira(ab2 && ab2.ok && JSON.stringify(ab2.mapa.fisica) === fis0, 'o mapa publicado não muda (a física da sala é só da sala)');
  const G = entra(t, 'Gil'); G.manda({type:'join', code:sala.code});
  confira(G.ult('mapa_sala') && G.ult('mapa_sala').hash === ms.hash && G.ult('mapa_sala').mapa.fisica.perfil.rBola === 1.5, 'quem entra recebe o mapa com a física da sala');
  let lista = (G.manda({type:'list'}), G.ult('rooms')), item = lista.list.find(x => x.code === sala.code);
  confira(item && item.mapa && item.mapa.fisica === true, 'a lista das salas avisa que a sala tem física própria', item && item.mapa);
  // nos ajustes (antes da partida): outra predefinição; quem está na sala recebe o mapa de novo
  G.limpa(); F.c.baldes = {};
  F.manda({type:'config', fisicaSala:{preset:'rapido'}});
  ms = G.ult('mapa_sala');
  confira(ms && ms.mapa.fisica.preset === 'rapido' && F.sala().mapa.fisicaSala.preset === 'rapido' && ms.hash !== h0, 'o admin troca para Rápido nos ajustes: todo mundo na sala recebe o mapa novo', ms && ms.mapa.fisica);
  G.limpa(); G.manda({type:'config', fisicaSala:{preset:'arcade'}});
  confira(!G.ult('mapa_sala') && F.sala().mapa.fisicaSala.preset === 'rapido', 'quem não é admin não mexe na física');
  F.c.baldes = {}; F.manda({type:'config', fisicaSala:'bola gigante'});
  confira(F.ult('error') && /veio errada/.test(F.ult('error').message) && F.sala().mapa.fisicaSala.preset === 'rapido', 'física que não é um objeto: recusada (a sala continua como estava)');
  F.c.baldes = {}; F.manda({type:'config', fisicaSala:{preset:'personalizado', perfil:{rBola:1.4, limiteBola:70, fatorBola:0.995, massaBola:6, quiqueParede:0.9}, extra:{acelJog:0.7}}});
  F.manda({type:'start'});
  const rr = t.salaDe(F.c), C = rr.partida && rr.partida.P && rr.partida.P.C;
  confira(C && Math.abs(C.R_BOLA - M.U(1.4)) < 1e-9 && Math.abs(C.LIMITE_VEL_BOLA - M.U(70)) < 1e-9 && C.FATOR_BOLA === 0.995 && C.MASSA_BOLA === 6 && C.EXTRA.acelJog === 0.7, 'a partida no servidor roda com a física da sala (bola, teto, freio, peso e a aceleração da tampinha)', C && {R:C.R_BOLA, L:C.LIMITE_VEL_BOLA, F:C.FATOR_BOLA, m:C.MASSA_BOLA, x:C.EXTRA});
  rr.partida.desligar();
  F.c.baldes = {}; F.manda({type:'config', fisicaSala:null});
  confira(F.sala().mapa.fisicaSala.preset === 'personalizado', 'com a partida rolando, a física não muda');
  rr.partida = null; rr.state = 'ended';
  F.c.baldes = {}; G.limpa(); F.manda({type:'config', fisicaSala:null});
  confira(F.sala().mapa.fisicaSala === null && G.ult('mapa_sala') && G.ult('mapa_sala').hash === h0, 'depois da partida, VOLTAR PARA A DO MAPA: o mesmo mapa (o mesmo hash) de antes', G.ult('mapa_sala') && G.ult('mapa_sala').hash);
  // a sala comum ignora a física da sala
  const K = entra(t, 'Kai'); K.manda({type:'create', n:2, bots:true, fisicaSala:{preset:'arcade'}});
  const sk = K.sala(); confira(sk && !sk.mapa && sk.fisica && !K.ult('mapa_sala'), 'a sala comum não tem física da sala (a física oficial do RACHA de sempre)', sk && sk.fisica);
  t.fecha();
}

function v93NasSalas(){
  console.log('\n9) a v93 nas salas com mapa: o 3, 2, 1, JÁ!, o painel de jogadores e o admin da sala (até 4 times)');
  const t = novaTurma();
  const A = entra(t, 'Ana', {v93:1}), B = entra(t, 'Bia', {v93:1}), C = entra(t, 'Caio', {v93:1});
  const pub = A.pede('publicar', {mapa:mapa4(), visibilidade:'publico'});
  A.manda({type:'create', mapa:{id:pub.meta.id}, bots:true, n:1});
  const code = A.sala().code;
  B.manda({type:'join', code}); B.manda({type:'seat', team:2});
  C.manda({type:'join', code, spectate:true});
  A.limpa(); B.limpa(); C.limpa();
  A.manda({type:'start'});
  const r = t.salaDe(A.c), cg = A.ult('contagem');
  confira(cg && cg.ms > 0 && r.contagem && r.partida && r.partida.pausado && C.ult('contagem'), 'a sala com mapa também tem o 3, 2, 1, JÁ!: o servidor segura a partida e avisa todo mundo (quem assiste também)', cg);
  r.partida.desligar();                                // (o teste anda o motor na mão)
  const P = r.partida, qa = P.jog[0], x0 = qa.x, t0 = P.tick;
  for (let s = 1; s <= 12; s++){ anda(1000/60); A.manda({type:'input', seq:s, x:1, y:0, button:1}); P.passo(); }
  confira(P.tick === t0 && qa.x === x0, 'durante a contagem nada anda (o motor parado)', [P.tick, t0, qa.x, x0]);
  t.contagemFim(r);
  confira(!r.contagem && !P.pausado && qa.fila && qa.fila.fila.length === 0, 'no JÁ! a partida solta e os comandos que chegaram antes não valem');
  const y0 = qa.y;
  for (let s = 13; s <= 40; s++){ anda(1000/60); A.manda({type:'input', seq:s, x:0, y:1, button:1}); P.passo(); }
  confira(qa.y > y0 + 20, 'depois do JÁ! a tampinha da Ana anda', [qa.y, y0]);
  // o painel de jogadores (a cada 2 s): não quebra com a partida no mapa e mostra os 4 lugares
  A.limpa(); let erro = null; try { t.painels(); } catch (e) { erro = String(e && e.stack || e); }
  const pn = A.ult('painel');
  confira(!erro && pn && pn.j.length === 4 && pn.j[0].id === A.id && pn.j[2].id === B.id && pn.fora.some(x => x.id === C.id), 'o painel de jogadores sai na sala com mapa (os 4 lugares e quem assiste)', erro || pn);
  // o admin da sala no meio da partida (até 4 times, com os nomes do mapa)
  const nomes = r.mapaDados.partida.times.map(x => x.nome);
  A.limpa(); A.manda({type:'adm', acao:'mover', id:C.id, time:3});
  confira(r.roster[3] === C.id && P.jog[3].netId === C.id && !P.jog[3].bot, 'o admin põe quem assistia no 4º time no meio da partida (a tampinha passa para ele)', r.roster);
  confira(A.todas('say').some(x => x.text.includes(nomes[3])), 'o chat da sala diz o nome do time do mapa (' + nomes[3] + ')', A.todas('say').map(x => x.text));
  A.manda({type:'adm', acao:'mover', id:B.id, slot:3});
  confira(r.roster[3] === B.id && r.roster[2] === C.id && P.jog[3].netId === B.id && P.jog[2].netId === C.id, 'o admin troca dois de lugar: cada um passa para a tampinha do outro', r.roster);
  A.manda({type:'adm', acao:'reserva', id:C.id});
  confira(r.roster[2] === null && !P.jog[2].bot && P.jog[2].vazio && P.jog[2].fora && !P.jog[2].netId, 'RESERVA: quem sai vai para o banco e a vaga fica vazia (v103: sem bot no lugar)');
  A.limpa(); B.limpa(); A.manda({type:'adm', acao:'encerrar'});
  for (let i = 0; i < 120 && r.partida; i++){ anda(1000/60); r.partida.passo(); }
  const res = B.ult('result');
  confira(r.state === 'ended' && res && res.custom && res.valida === false && !r.partida && !r.contagem, 'ENCERRAR do admin: o apito final da partida no mapa (o resultado não vale prêmio)', res);
  // e quem está na sala comum continua com tudo da v93
  t.fecha();
}

function revisao(){
  console.log('\n10) a revisão de segurança desta versão: a troca de mapa no ritmo, o pedido recusado sem mexer na sala, as vagas sem bots, os números da pessoa, a mensagem grande, o não listado e as falas silenciadas');
  const t = novaTurma();
  const A = entra(t, 'Ana', {v93:1}), B = entra(t, 'Bia', {v93:1}), C = entra(t, 'Caio', {v93:1});
  anda(20000); const m1 = A.pede('publicar', {mapa:mapaBase({nome:'Dois'}), visibilidade:'publico'});
  anda(20000); const m4 = A.pede('publicar', {mapa:mapa4(), visibilidade:'publico'});
  anda(20000); const mn = A.pede('publicar', {mapa:mapaBase({nome:'Escondido'}), visibilidade:'naoListado'});
  A.manda({type:'create', mapa:{id:m1.meta.id}, bots:false, n:2});
  const r = t.salaDe(A.c), code = r.code;
  B.manda({type:'join', code, spectate:true});
  // o mesmo mapa de novo: nada a trocar (nada de validar, compilar e mandar 200 KB para a sala inteira)
  B.limpa(); A.c.baldes = {};
  for (let i = 0; i < 3; i++) A.manda({type:'config', mapa:{id:m1.meta.id}});
  confira(!B.ult('mapa_sala') && !A.ult('error'), 'escolher o MESMO mapa de novo: nada muda e ninguém recebe o mapa outra vez', [B.todas('mapa_sala').length, A.ult('error')]);
  // trocar de mapa tem ritmo próprio (cada troca valida, compila e manda o mapa inteiro)
  B.limpa(); A.limpa(); A.c.baldes = {};
  for (let i = 0; i < 8; i++) A.manda({type:'config', mapa:{id:(i % 2 ? m1 : m4).meta.id}});
  const err = A.todas('error').filter(e => /trocar o mapa/.test(e.message));
  confira(B.todas('mapa_sala').length === 4 && err.length === 4, 'trocar de mapa sem parar: as 4 primeiras valem e as outras esperam ("Calma…")', [B.todas('mapa_sala').length, err.length]);
  // o pedido com uma parte errada não muda nada (nem o mapa, nem os times) e ninguém fica com a sala pela metade
  anda(20000); A.c.baldes = {};
  const antes = {E:r.E, n:r.n, hash:r.custom.hash, roster:r.roster.length};
  B.limpa(); A.limpa();
  A.manda({type:'config', mapa:{id:(r.E === 4 ? m1 : m4).meta.id}, n:1, fisicaSala:'bola gigante'});
  confira(A.ult('error') && /veio errada/.test(A.ult('error').message) && r.E === antes.E && r.n === antes.n && r.custom.hash === antes.hash && r.roster.length === antes.roster && !B.ult('mapa_sala'),
    'trocar o mapa com a física errada junto: recusado INTEIRO (o mapa, os times e as vagas ficam como estavam)', [antes, r.E, r.n]);
  // sem bots: a vaga que o admin esvazia fica vazia; quem entra no meio do jogo entra já no campo
  anda(20000); A.c.baldes = {}; A.manda({type:'config', mapa:{id:m1.meta.id}, n:2, bots:false});
  if (r.roster[0] !== A.id) A.manda({type:'seat', team:0});
  A.limpa(); A.manda({type:'start'});
  t.contagemFim(r); const P = r.partida; P.desligar();
  for (let i = 0; i < 30; i++){ anda(1000/60); P.passo(); }
  P.P.estado = 'jogo';
  const slotB = 3;
  A.manda({type:'adm', acao:'mover', id:B.id, slot:slotB});
  const qb = P.jog[slotB];
  confira(r.roster[slotB] === B.id && qb.netId === B.id && !qb.fora && !qb.vazio && Number.isFinite(qb.x), 'sem bots, no meio do jogo: quem o admin põe numa vaga VAZIA entra já no campo (no ponto de nascimento)', {fora:qb.fora, x:qb.x, estado:P.estado});
  A.manda({type:'adm', acao:'reserva', id:B.id});
  confira(qb.vazio && qb.fora && !qb.bot && !qb.netId && A.todas('say').some(x => /fica vazia/.test(x.text)), 'sem bots, o BANCO deixa a vaga vazia (não vira bot) e o chat diz isso', {vazio:qb.vazio, bot:qb.bot, say:A.todas('say').map(x => x.text).slice(-1)});
  // os números são da pessoa: quem troca de vaga leva os gols
  A.manda({type:'adm', acao:'mover', id:B.id, slot:1});
  const qa = P.jog[r.roster.indexOf(A.id)]; qa.golsFeitos = (qa.golsFeitos | 0) + 2; qa.assist = (qa.assist | 0) + 1;
  A.manda({type:'adm', acao:'mover', id:A.id, slot:1});   // (a Ana e a Bia trocam de lugar)
  let est = P.est;
  confira(est[A.id] && est[A.id].g === 2 && est[A.id].a === 1 && est[B.id] && est[B.id].g === 0 && est[A.id].i === 1, 'os gols e as assistências vão com a PESSOA quando ela troca de vaga (o painel da v93)', {ana:est[A.id], bia:est[B.id]});
  A.limpa(); B.limpa(); A.manda({type:'adm', acao:'encerrar'});
  for (let i = 0; i < 120 && r.partida; i++){ anda(1000/60); r.partida.passo(); }
  const res = B.ult('result'), ja = res && res.jog.find(j => j.id === A.id), jb = res && res.jog.find(j => j.id === B.id);
  confira(ja && ja.gols === 2 && ja.assist === 1 && jb && jb.gols === 0, 'e no resultado (o craque e a tela do fim) também', res && res.jog);
  // a mensagem grande com o "type" repetido no meio: vale o que o JSON leu (e a grande só passa para o mapa)
  A.limpa(); B.limpa(); A.c.baldes = {};
  const grande = '{"type":"config","x":"' + 'a'.repeat(70000) + '","type":"say","text":"passou pela porta dos mapas"}';
  A.ws.emit('message', grande);
  confira(!B.todas('say').some(x => /porta dos mapas/.test(x.text || '')), 'a mensagem de 70 KB que começa como "config" e termina como "say": descartada (só o mapa passa do tamanho)');
  // o mapa não listado numa sala aberta: a lista pública de salas não mostra o código dele
  anda(20000); C.c.baldes = {};
  C.manda({type:'create', mapa:{codigo:mn.meta.codigo}, bots:true, n:1, pub:true, name:'Sala do escondido'});
  const sc = C.sala(); B.manda({type:'list'});
  const item = (B.ult('rooms') || {list:[]}).list.find(x => x.code === sc.code);
  confira(sc && sc.pub && item && item.mapa && item.mapa.nome === 'Escondido' && item.mapa.codigo === '', 'mapa NÃO LISTADO numa sala aberta: a lista de salas mostra o nome, sem o código do mapa', item && item.mapa);
  // as falas de quem foi silenciado na sala esperam (como o chat)
  const rc = t.salaDe(C.c); B.manda({type:'join', code:sc.code}); B.manda({type:'seat', team:1});
  C.manda({type:'start'}); t.contagemFim(rc); rc.partida.desligar();
  (rc.silencio || (rc.silencio = new Map())).set(C.id, Date.now() + 60000);
  B.limpa(); C.c.baldes = {}; C.manda({type:'fala', i:2});
  confira(!B.ult('fala'), 'quem foi silenciado na sala (denúncias) não manda balão de fala');
  rc.silencio.delete(C.id); anda(3000); C.manda({type:'fala', i:2});
  confira(B.ult('fala') && B.ult('fala').i === 2, '…e depois do silêncio, manda');
  t.fecha();
}

async function rede(){
  console.log('\n7) pela rede de verdade (WebSocket): publicar e abrir sala com mapa');
  const {fork} = require('child_process');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'racha-mapas-rede-'));
  const filho = fork(path.join(RAIZ, 'server', 'servidor.js'), ['--porta', '0', '--memoria', '--visitantes', '--mapas', dir], {silent:true, env:Object.assign({}, process.env, {RACHA_MAPAS:dir})});
  const porta = await new Promise((res, rej) => { filho.on('message', m => { if (m && m.pronto) res(m.porta); }); setTimeout(() => rej(new Error('o servidor não subiu')), 8000); });
  const conecta = () => new Promise((res, rej) => {
    const ws = new WebSocket('ws://127.0.0.1:' + porta + '/');
    const k = {ws, caixa:[], espera:(tipo, f, ms) => new Promise((ok2, no) => { const t0 = Date.now(); const v = () => { const x = k.caixa.find(m => m.type === tipo && (!f || f(m))); if (x) return ok2(x); if (Date.now() - t0 > (ms || 4000)) return no(new Error('não chegou ' + tipo)); setTimeout(v, 20); }; v(); })};
    ws.onmessage = e => { try { k.caixa.push(JSON.parse(e.data)); } catch (_) {} };
    ws.onopen = () => res(k); ws.onerror = rej;
  });
  try {
    const A = await conecta(), B = await conecta();
    A.ws.send(JSON.stringify({type:'hello', name:'Ana'})); B.ws.send(JSON.stringify({type:'hello', name:'Bia'}));
    await A.espera('hello'); await B.espera('hello');
    const objs = []; for (let i = 0; i < 150; i++) objs.push({id:'d' + i, tipo:'decoracao', forma:'poligono', x:(i % 15) * 4 - 30, y:Math.floor(i / 15) * 4 - 20, nome:'enfeite ' + i,
      pontos:Array.from({length:48}, (_, k) => [Math.round(Math.cos(k / 48 * 6.283) * 137) / 100, Math.round(Math.sin(k / 48 * 6.283) * 113) / 100])});
    A.ws.send(JSON.stringify({type:'mapa_req', rid:1, op:'publicar', args:{mapa:mapa4(), visibilidade:'publico', thumb:PNG}}));
    const pub = await A.espera('mapa_res', m => m.rid === 1);
    confira(pub.ok && pub.meta.codigo, 'publicou pela rede', pub);
    A.ws.send(JSON.stringify({type:'create', mapa:{codigo:pub.meta.codigo}, bots:true, n:1}));
    const ms = await A.espera('mapa_sala'), room = await A.espera('room');
    confira(ms.mapa.partida.equipes === 4 && room.room.E === 4, 'a sala com o mapa de 4 times abriu pela rede');
    B.ws.send(JSON.stringify({type:'join', code:room.room.code, rapido:true}));
    await B.espera('mapa_sala');
    A.ws.send(JSON.stringify({type:'start'}));
    await A.espera('start');
    let seq = 0; const iv = setInterval(() => { seq++; A.ws.send(JSON.stringify({type:'input', seq, x:0.5, y:0, button:1})); }, 1000 / 60);
    await new Promise(r => setTimeout(r, 1500));
    clearInterval(iv);
    const snaps = B.caixa.filter(m => m.type === 'snapshot');
    const ritmo = snaps.length / 1.5;
    confira(snaps.length > 20 && snaps[snaps.length - 1].data.sc.length === 4, 'a Bia recebe os quadros da partida no mapa (' + ritmo.toFixed(0) + ' por segundo)');
    const ultimo = snaps[snaps.length - 1].data.p[0];
    confira(ultimo[4] > 30, 'o servidor aplicou os comandos da Ana (ack ' + ultimo[4] + ')');
    // a mensagem grande pela rede (o mapa com 300 objetos)
    const grande = mapaBase({nome:'Grandão', objetos:mapaBase().objetos.concat(objs)});
    await new Promise(r => setTimeout(r, 16000));       // (o ritmo de publicar: 15 s)
    A.ws.send(JSON.stringify({type:'mapa_req', rid:2, op:'publicar', args:{mapa:grande}}));
    const pg = await A.espera('mapa_res', m => m.rid === 2, 6000);
    confira(pg.ok && JSON.stringify(grande).length > 65536, 'o mapa grande (' + Math.round(JSON.stringify(grande).length / 1024) + ' KB, mais que os 64 KB das outras mensagens) foi publicado pela rede', pg.erro);
    A.ws.close(); B.ws.close();
  } catch (e) { confira(false, 'a conversa pela rede', String(e && e.stack || e)); }
  filho.kill('SIGTERM');
  await new Promise(r => setTimeout(r, 300));
  confira(fs.existsSync(path.join(dir, 'indice.json')), 'o servidor de verdade gravou o catálogo na pasta dos mapas (--mapas) ao desligar');
  fs.rmSync(dir, {recursive:true, force:true});
}

(async () => {
  const t0 = Date.now();
  const ctx = catalogo();
  permissoes(ctx);
  await denuncias(ctx);
  ctx.t.fecha();
  disco();
  salas();
  privado();
  publicosEFisica();
  v93NasSalas();
  revisao();
  if (typeof WebSocket === 'function') await rede(); else console.log('  (sem WebSocket no Node: a parte pela rede ficou de fora)');
  console.log('\noficina_servidor: ' + ok + '/' + (ok + falhou) + ' verificações ok em ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
  for (const f of falhas) console.log('  - falhou: ' + f);
  process.exit(falhou ? 1 : 0);
})();
