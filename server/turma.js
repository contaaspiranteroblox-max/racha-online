'use strict';
/* =====================================================================================================================
   RACHA · O SERVIDOR DA TURMA — as salas online, o Chat do Brasil, os clubes, a copa dos amigos e os duelos 1v1.
   Sem dependências (Node 18 ou mais novo). Fala o protocolo que o jogo já fala (ver server/LEIAME.md).

   QUEM RODA A PARTIDA é o aparelho do dono da sala (o anfitrião): ele simula a física e manda os quadros (snapshot);
   os outros mandam os comandos (input) e o servidor entrega cada coisa para quem precisa. O servidor NÃO simula a bola:
   ele organiza a sala (times, regras, árbitro, pausa, revanche, quem entra e quem sai), repassa, e CONFERE O RESULTADO
   antes de guardar qualquer coisa: só vale o fim mandado pelo anfitrião, da rodada certa, com o mesmo placar dos quadros,
   com um placar possível para o modo e um tempo de jogo possível (partida encerrada pelo árbitro não vale). Só o que
   passou na conferência vira troféu (vitória), conta para o clube, para os duelos e para a copa.
   Com o segredo da plataforma (RACHA_SEGREDO_SALAS) ele também reconhece quem entrou com a conta do RACHA (o bilhete
   assinado pela plataforma) e assina o resultado de cada um (o selo), que a plataforma confere antes de dar XP.
   v79 · A RANQUEADA ONLINE: quem toca em JOGAR entra na fila do tamanho escolhido (fila {n, pts}); o servidor junta quem
   está esperando (pelos pontos mais perto) numa sala ranqueada (no Estádio, até 3 gols, sem árbitro nem revanche) e
   começa na hora. Depois de 8 s, 2 ou mais pessoas no mesmo tamanho jogam juntas e os bots completam; com ninguém em
   20 s, vai fila_nada e o jogo joga contra os bots. E o SELO da conta (verificado, parceiro, equipe, criador), que só
   vem assinado pela plataforma (o bilhete ou a sessão do site), vai no cartão da sala, na lista e no Chat do Brasil.
   v80 · A PARTIDA NORMAL (a ranqueada online, regra 'v80'): o RELÓGIO É DO SERVIDOR. 3:00 de jogo (sem as pausas);
   quem tiver mais gols no fim vence; 3 gols acabam na hora; 1 × 1 e 2 × 2 terminam empatados; só o 0 × 0 vai para a
   prorrogação (até −2:00: o primeiro gol vence, o GOL DE OURO; sem gol, empate). O servidor manda o relógio a cada
   segundo (relogio), anota cada gol na linha do tempo (o relógio dele e o que o anfitrião mandou), confere o resultado
   por ela (gol depois do fim, depois do tempo ou com o relógio do anfitrião longe do dele não vale) e encerra sozinho a
   partida que passou do fim sem o anfitrião mandar o resultado. Os times agora são o Time A (laranja) e o Time B (roxo).
   v81 · O CHAT: cada mensagem da sala tem um número (mid); `report {mid}` denuncia (2 pessoas diferentes: a mensagem some para
   todos, `say_hide`, e quem escreveu fica 5 min sem falar naquela sala); a mensagem repetida em menos de 30 s não vai; o filtro
   (o mesmo do Chat do Brasil) barra palavrão, link, @ e também telefone, e-mail e número de CPF (dados pessoais).
   v82 · AS CONTAS: o selo do resultado leva também se a partida era da RANQUEADA (k) e o tamanho do time (n) — a plataforma
   só mexe na patente da conta com o selo de uma ranqueada; os IDs de quem joga sem conta passam a ter 7 dígitos (9.000.001…),
   longe dos IDs das contas (6 dígitos), e a busca por ID acha a conta primeiro.
   v83 · SALAS 100% HOSPEDADAS NO SERVIDOR: NINGUÉM mais é anfitrião. Toda partida de sala (pública, privada, copa e
   ranqueada) é simulada aqui, no motor PartidaSala (partida/sala.js — o porte fiel da física do jogo): os aparelhos
   mandam só os comandos (input) e recebem os quadros (snapshot) no formato de sempre. O criador da sala vira um jogador
   comum durante a partida: ele só administra a sala (configurar, expulsar, começar) e essa função pode ser transferida —
   a simulação NUNCA sai do servidor. Se ele (ou qualquer um) cair no meio da partida, um bot assume a tampinha dele e a
   partida segue; ele volta para o mesmo lugar em até 90 s. Snapshot ou finish mandados por aparelho em sala hospedada
   não valem nada (viram registro de suspeito para investigação — sem banimento automático). Nas salas hospedadas a
   publicação mostra host:'srv' e o criador em admin: o jogo já entende isso como "a partida na nuvem" (v1.3 do cliente).
   v88 · O SOCIAL AO VIVO (server/social88.js): o status dos amigos (online, na sala, procurando, em partida), os convites
   para a sala e para o time, o chat dos amigos, do clube e da equipe, o bloqueio aplicado no servidor (chat, convites,
   históricos), a denúncia com motivo (vai para a plataforma quando ela está montada aqui), o histórico sem o texto das
   mensagens escondidas, o placar das salas em jogo na lista (para assistir) e o selo com quem jogou junto (g) e o melhor
   da partida (v). A física, a fila e a conferência do resultado não mudaram.
   ===================================================================================================================== */
const {Banco, sha, novoToken, novoId, limpa, inteiro, assina, confere} = require('./banco');
const {ipCliente} = require('./ip');                  // v100 (segurança): o endereço de quem conecta (sem acreditar no X-Forwarded-For do cliente)
const {Clubes, Erro} = require('./clubes');
const {GerenteAuto} = require('./partida/gerente');   // v83: as partidas autoritativas (a física no servidor)
const {PartidaSala} = require('./partida/sala');      // v83: as salas 100% hospedadas (a física das salas no servidor)
const NUCLEO = require('./partida/nucleo');
const AVISO_V105 = 'Tem jogo novo (a física das salas mudou): atualize o jogo — recarregue a página ou feche e abra o app — para jogar online.';
// v94 · o motor próprio (server/partida/motor.js): só carrega se existir (o mesmo arquivo vai no jogo, para a previsão)
let M94 = null; try { M94 = require('./partida/motor'); } catch (_) { M94 = null; }           // v92: o núcleo compartilhado da física das salas (o perfil de cada sala)
const social88 = require('./social88');               // v88: amigos, convites, chats novos, bloqueio e denúncia
const fundador96 = require('./fundador96');           // v96: a tampinha dos fundadores (só quem a plataforma diz que é fundador aparece com ela)
const path = require('path');
const {Mapas, MAX_PUBLICOS} = require('./mapas');                   // v92 · OFICINA: o catálogo dos mapas da comunidade (gravado em disco)
// (a pasta do server/: no pacote ESM da plataforma — o esbuild de app/ — não existe __dirname; ali vale a pasta de onde ela roda)
const PASTA_SERVIDOR = typeof __dirname === 'string' ? __dirname : path.resolve('server');
const {PartidaMapa} = require('./partida/sala_mapa'); // v92 · OFICINA: a partida no mapa personalizado (até 4 times)
const RachaMapa = require('./partida/mapa');          // v92 · OFICINA: a validação do mapa (a mesma do jogo)
const linhasDoMapa = mapa => !!(mapa && mapa.partida && mapa.partida.linhas === true);   // v95: o criador ligou as linhas da bola para todos
const hashMapa = mapa => require('crypto').createHash('sha256').update(JSON.stringify(mapa)).digest('hex').slice(0, 16);   // (o mapa da sala: muda o hash, o aparelho pede de novo)
// v98 · AS SALAS ONLINE DO RACHÃO: a partida com o motor do Rachão (server/partida/rachao_motor.js, gerado da página pelo build).
// Sem o arquivo gerado (um servidor montado sem o build), o resto funciona e criar sala do Rachão avisa.
let RCH = null; try { RCH = require('./partida/rachao'); } catch (e) { RCH = null; console.error('salas do Rachão desligadas: ' + (e && e.message)); }
const grupo93 = require('./grupo93');                 // v93 · Fase 4: o grupo com líder (jogar junto com os amigos na ranqueada)
const fila95 = require('./fila95');                   // v95: a ranqueada ao vivo (quantos online, jogando e procurando em cada tamanho)
const emotes106 = require('./emotes106');             // v106: os emojis da partida (emote {e}: o balão em cima da tampinha para todos da sala)
const silencio109 = require('./silencio109');         // v109: o silêncio da equipe (RACHA CONTROL) em todos os chats e a expulsão da sala

const MODOS = ['futebol', 'curva', 'ginga', 'volei', 'americano', 'basquete'];   // (todos os que o jogo sabe conferir)
const MODOS_SALA = ['futebol', 'curva'];             // v70.2: as salas só abrem FUTEBOL e COM CURVA (os outros modos ficaram guardados no jogo)
const META = {futebol:3, curva:3, ginga:5, volei:3, americano:3, basquete:12};     // até quanto vai (sem tempo)
const MAX_PTS = {futebol:1, curva:1, ginga:2, volei:1, americano:1, basquete:3};    // o máximo de um lance (cesta de 3, gol de ginga)
const TEMPOS = [0, 2, 3, 5, 10];                 // (v113: + os 10 minutos nas salas personalizadas)
const N_MAPAS = 5;                                     // v70.2: 0 Arena · 1 Favela · 2 Escadão · 3 Viaduto · 4 Estádio (o gramado)
const MAPAS_SALA = [4, 0];                             // v70.2: as salas só abrem a ARENA e o ESTÁDIO · v79: o ESTÁDIO primeiro (o mapa padrão)
const MAPA_RANQUEADA = 4;                              // v79: a ranqueada é no Estádio
const FILA_MAX_MS = 20000, FILA_MISTA_MS = 8000;       // v79: a procura dura até 20 s; depois de 8 s, quem espera junto joga com bots completando
const CONTAGEM_MS = process.env.RACHA_CONTAGEM_MS != null && process.env.RACHA_CONTAGEM_MS !== '' && Number(process.env.RACHA_CONTAGEM_MS) >= 0 ? Number(process.env.RACHA_CONTAGEM_MS) : 3000;   // v93: 3, 2, 1, JÁ! antes de começar (os testes antigos podem pedir 0)
const REPLAY_MS = Number(process.env.RACHA_REPLAY_MS) > 0 ? Number(process.env.RACHA_REPLAY_MS) : 7000;   // v93: o replay do gol online (no máximo: com todos votando, pula antes)
const FALAS93 = 8;                                     // v93 · Fase 5: as frases prontas do balão (Golaço!, Que defesa!, Passa!, Boa!, Foi mal!, Obrigado!, Sem problemas!, Minha culpa!)
const REPLAY_ON = process.env.RACHA_REPLAY !== '0';    // v93: o replay do gol nas salas (RACHA_REPLAY=0 desliga: os testes antigos)
const REGRA80 = {seg:180, prorrog:120, meta:3};       // v80: a partida normal (3:00, a prorrogação de 2:00 só no 0 × 0, até 3 gols)
const TOL80 = {fim:2, atraso:3, adiante:1.5, sozinho:10, linha:64};   // v80 (s): o fim pode chegar 2 s antes da hora · o gol chega até 3 s depois
                                                       // do relógio do anfitrião (a rede) e o anfitrião não fica 1,5 s à frente do servidor ·
                                                       // 10 s depois da hora do fim, o servidor encerra · no máximo 64 mudanças de placar
const SELOS = ['equipe', 'criador', 'verificado', 'parceiro'];   // v79: o selo que aparece na frente do nome (o primeiro que a conta tiver)
const seloDe = l => Array.isArray(l) ? SELOS.find(s => l.includes(s)) || '' : '';
const MAX_GENTE = 17, MAX_SALAS = 300;              // v114: a sala personalizada cabe até 17 pessoas (eram 12): os times em campo (até 4x4) + quem assiste e espera a vez
// v100 (segurança): quantas conexões abertas ao mesmo tempo — por endereço (as operadoras de celular põem muita gente atrás
// do mesmo IP: o limite é folgado) e no servidor inteiro. Passou: a conexão nova é recusada (código 1013, "tente depois").
const numeroEnv = (v, padrao) => { const n = Number(v); return Number.isInteger(n) && n > 0 ? n : padrao; };
const MAX_CONEXOES_IP = numeroEnv(process.env.RACHA_CONEXOES_IP, 256), MAX_CONEXOES = numeroEnv(process.env.RACHA_CONEXOES, 5000);   // (256: a escola, a lan house, a operadora com muita gente no mesmo IP)
// v100: a conexão que não se apresenta (hello ou brasil_join) cai depois deste prazo (não fica ocupando o teto de conexões)
const PRAZO_HELLO_MS = numeroEnv(process.env.RACHA_PRAZO_HELLO_MS, 30000);
// v100: depois da punição, quanto tempo o bilhete de antes dela ainda poderia estar no prazo (o bilhete vale 15 min; o de uma
// plataforma antiga, 30): passado isso, a lembrança da punição não serve mais para nada
const PUNIDAS_MS = 35*60e3;
const MAX_GENTE_MAPA = 20;                            // v92 · OFICINA: a sala com mapa cabe até 16 jogadores + quem assiste
const NOMES_TIME = ['Time A', 'Time B', 'Time C', 'Time D'];
const ALFA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ARB_RE = /^⁣?ARB:([a-z])(?:\|([0-9a-z|,-]*))?$/;                         // as mensagens escondidas do árbitro (v68)
const SKIN_RE = /^[A-Za-z0-9._-]{1,48}$/, ESCUDO_RE = /^E\.[A-Za-z0-9_-]{4,44}$/;
const FILTRO = [
  /p[o0]+rr+a|p\*+a|put[4@a]|c[4a]r[4a]lh|buc[3e]t|f[0o]d[4a]|cuz[4aã]o|v[14i]a?d[o0]|p[3e]n[1i]s|m[3e]rd[4a]|arromb|vagabund|desgra[cç]|otari|retard|macac[oa]|preti[nh]/i,   // palavrão e ofensa (e as variações)
  /https?:|www\.|\.com\b|\.net\b|\.gg\b|\.br\b|discord\.|t\.me\/|bit\.ly|wa\.me|\.io\b|\.app\b|\.xyz\b|\.link\b|\.org\b/i,   // link (v81: mais alguns)
  /@[a-z0-9_.]{3,}/i,                                                                                                    // @ de rede social
  /(?:\(?\d{2}\)?[\s.-]?)?9?\s?\d{4}[\s.-]?\d{4}\b/,                                                                      // v81: telefone (dados pessoais)
  /\b\d{3}[.\s]?\d{3}[.\s]?\d{3}[-.\s]?\d{2}\b/,                                                                           // v81: número tipo CPF
  /\S+@\S+\.\S+/                                                                                                         // v81: e-mail
];
const filtrado = t => FILTRO.some(r => r.test(t));
const limpaNome = s => limpa(s, 16) || 'Jogador';
const skinOk = s => typeof s === 'string' && SKIN_RE.test(s) ? s : '';
const flagOk = s => typeof s === 'string' && /^[A-Z]{2}$/.test(s) ? s : '';
function avatarOk(a){
  if (!a || typeof a !== 'object') return null;
  return {t:limpa(a.t, 3), e:typeof a.e === 'string' && /^[a-z0-9_-]{0,24}$/i.test(a.e) ? a.e : '', cor:typeof a.cor === 'string' && /^#[0-9a-f]{6}$/i.test(a.cor) ? a.cor : '#ffffff'};
}
function clubeAnunciado(o){                             // o clube que o jogo conta (o da conta do RACHA): só nome e escudo, para o cartão
  if (!o || typeof o !== 'object') return null;
  const name = limpa(o.nome, 24); if (!name) return null;
  return {name, tag:name.slice(0, 3).toUpperCase(), escudo:ESCUDO_RE.test(o.escudo || '') ? o.escudo : null, color:'#3f7fe0', badge:'escudo', fonte:'conta'};
}
const embaralha = l => { for (let i = l.length - 1; i > 0; i--){ const j = Math.floor(Math.random()*(i + 1)); [l[i], l[j]] = [l[j], l[i]]; } return l; };

class Turma {
  /* opcoes: arquivo (o JSON; sem ele só memória) · nome (aparece na sala) · segredo (o da plataforma, para o bilhete e o
     selo) · p2p (false = sem a conexão direta; tudo pelo servidor) · ice (os servidores STUN/TURN para a conexão direta) · log */
  constructor(o){
    o = o || {};
    this.nome = limpa(o.nome, 40) || 'Servidor da turma';
    this.segredo = o.segredo || '';
    this.p2p = o.p2p !== false;
    this.exigeConta = o.exigeConta !== false;            // v84: sem conta da plataforma não entra nas salas (login obrigatório)
    this.agora = typeof o.agora === 'function' ? o.agora : Date.now;   // (os testes adiantam o relógio da partida)
    const r8 = o.regra80 || {};                          // v80: o tempo da partida normal (3:00 e 2:00; os testes e as demonstrações podem encurtar)
    this.r80 = {seg:r8.seg > 0 ? Math.min(3600, +r8.seg) : REGRA80.seg, prorrog:r8.prorrog > 0 ? Math.min(3600, +r8.prorrog) : REGRA80.prorrog, meta:REGRA80.meta};
    this.ice = Array.isArray(o.ice) && o.ice.length ? o.ice : null;
    this.log = typeof o.log === 'function' ? o.log : (t => console.log(new Date().toISOString().slice(0, 19).replace('T', ' ') + ' ' + t));
    this.b = new Banco(o.arquivo, t => this.log(t));
    this.clubes = new Clubes(this.b, {mudou:id => this.clubeMudou(id)});
    this.v88Inicia(o);                                   // v88: relacoesDe e denuncia (a plataforma montada aqui), os convites, os chats novos
    this.clientes = new Set();
    this.porIp = new Map();                              // v100: as conexões abertas de cada endereço (o limite por IP)
    this.punidas = new Map();                            // v100: as contas suspensas/banidas/excluídas no RACHA CONTROL (ID público → quando)
    this.porId = new Map();                              // id → a conexão das salas (a mais nova)
    this.salas = new Map();
    this.chat = {msgs:[], seq:0, denuncias:new Map(), silencio:new Map(), onT:0};
    this.filaEsp = new Map();                            // v79: id → {c, n, pts, t0} (quem procura a ranqueada)
    this.filaT = null;
    this.listaT = null;
    this.relogio = setInterval(() => this.batimento(), 15000);
    if (this.relogio.unref) this.relogio.unref();
    // v83: as partidas autoritativas (a física roda AQUI, não no anfitrião). Mesma conta (o bilhete), mesmo selo,
    // salas separadas das de sempre: uma não interfere na outra. O jogo da v82 não manda auto_*, então nada muda para ele.
    this.auto = new GerenteAuto({segredo:this.segredo, agora:() => this.agora(), log:t => this.log(t),
      regra:{seg:this.r80.seg, prorrog:this.r80.prorrog}, assina});
    this.cronoT = setInterval(() => this.relogios(), 1000);   // v80: o relógio das partidas normais (1 vez por segundo)
    if (this.cronoT.unref) this.cronoT.unref();
    // v92: o perfil da física das salas. O padrão é o PERFIL_V92 (os números da v91 + o toque armado e a rede segurando a
    // tampinha); RACHA_FISICA=v91 volta exatamente ao comportamento da v91. Só com RACHA_EXPERIMENTAL=1 (a versão de testes)
    // o admin da sala pode mandar outro perfil pelo painel de testes (config.fisica) e os quadros a 60 por segundo.
    this.experimental = o.experimental != null ? !!o.experimental : process.env.RACHA_EXPERIMENTAL === '1';
    this.fisicaPadrao = o.fisica === 'v91' || process.env.RACHA_FISICA === 'v91' ? NUCLEO.PERFIL_V91 : NUCLEO.PERFIL_V92;
    // v92 · OFICINA: o catálogo dos mapas (curtidas, favoritos, denúncias, versões) fica gravado numa pasta — também com a
    // plataforma montada (que guarda o resto da turma na memória por padrão): o.mapas, RACHA_MAPAS ou server/dados/mapas;
    // o.mapas = null guarda só na memória (os testes). A equipe que modera: o selo 'equipe', o Dono e RACHA_MODERADORES.
    // (sem o.mapas nem RACHA_MAPAS: a pasta "mapas" ao lado do arquivo da turma — no VPS, /var/lib/racha/mapas, a única pasta
    //  em que o serviço pode gravar; sem arquivo da turma, server/dados/mapas)
    const dirMapas = o.mapas !== undefined ? o.mapas : (process.env.RACHA_MAPAS || (o.arquivo ? path.join(path.dirname(path.resolve(o.arquivo)), 'mapas') : path.join(PASTA_SERVIDOR, 'dados', 'mapas')));
    this.mapas = new Mapas({dir:dirMapas || null, log:t => this.log(t), agora:() => this.agora()});
    this.moderadores = new Set(String(o.moderadores || process.env.RACHA_MODERADORES || '').split(',').map(x => x.trim()).filter(Boolean));
    // v94: o motor das salas: 'v94' (o motor próprio) ou 'v93' (o de antes, para comparar). RACHA_MOTOR_JOGO escolhe o padrão;
    // na versão de testes o admin troca pelo painel (config.motor) e manda o perfil do motor novo (config.fisica94)
    const mp = o.motor || process.env.RACHA_MOTOR_JOGO || 'v93';
    this.motorPadrao = mp === 'v94' && M94 ? 'v94' : 'v93';
  }
  fisicaDe(r){ return r.fisica || this.fisicaPadrao; }   // v92: o perfil que vale na sala
  // v105 (a pedido: "tirar todo lag possível das partidas online"): as salas mandam 60 quadros por segundo (eram 30) — no
  // simulador da rede (tests/v102/sim.mjs) as correções da previsão caem pela metade (a da sua tampinha no 4G ruim: 6,1 → 2,1 px
  // no p95; o erro da bola: 16 → 11 px), por ~20 KB/s num 2v2. As salas do mapa da Oficina e as do Rachão seguem com 30 (os
  // motores delas); o painel de testes ainda escolhe; RACHA_QUADROS=30 volta ao de antes.
  quadrosDe(r){
    if (r.quadros === 30 || r.quadros === 60) return r.quadros;
    if (r.custom || r.rachao) return 30;
    return process.env.RACHA_QUADROS === '30' ? 30 : 60;
  }
  motorDe(r){ if (this.temChutes(r)) return 'v93'; return r.motor === 'v94' && M94 ? 'v94' : r.motor === 'v93' ? 'v93' : this.motorPadrao; }   // v94 · v99: com os chutes do Rachão, o núcleo
  temChutes(r){ return !!r.chutes && !r.custom && !r.rachao && !r.ranked && (r.jogo || 'futebol') === 'futebol'; }   // v99: a sala joga com os chutes do Rachão
  resolvido94(r){                                        // v94: o perfil do motor novo já resolvido (os aparelhos usam os mesmos números)
    if (!M94) return null;
    const k = JSON.stringify(r.fisica94 || null);
    if (!r.r94 || r.r94k !== k){ r.r94 = M94.resolve(r.fisica94 || M94.PADRAO); r.r94k = k; }
    return r.r94;
  }

  /* ------------------------------------------------------------------ as conexões */
  conecta(ws, req){
    const ip = ipCliente(req);                           // v100: o socket, ou o X-Forwarded-For só quando quem conectou é um proxy nosso
    const nIp = ip ? this.porIp.get(ip) || 0 : 0;
    if (this.clientes.size >= MAX_CONEXOES || nIp >= MAX_CONEXOES_IP){   // v100: o limite de conexões (por endereço e no total)
      const doIp = nIp >= MAX_CONEXOES_IP;
      this.log('conexão recusada: ' + (doIp ? MAX_CONEXOES_IP + ' conexões do mesmo endereço' : 'o servidor chegou em ' + MAX_CONEXOES + ' conexões'));
      try { ws.send(JSON.stringify({type:'error', message:doIp ? 'Muitas conexões deste endereço agora. Feche outras abas do jogo ou tente daqui a pouco.' : 'O servidor está cheio agora. Tente daqui a pouco.', codigo:'conexoes'})); } catch (_) {}
      try { ws.close(1013, 'muitas conexoes'); } catch (_) {}
      return null;
    }
    if (ip) this.porIp.set(ip, nIp + 1);
    const r = req && req.racha;                          // (montado na plataforma: a conta da sessão do site, conferida antes do aperto de mão)
    const contaSessao = r && /^\d{1,9}$/.test(String(r.idPublico)) ? {idPublico:String(Number(r.idPublico)).padStart(6, '0'), nome:limpa(r.nome, 20) || 'Jogador', selo:seloDe(r.selos), rel:r.rel || null} : null;   // v88: + as relações da conta (amigos, bloqueios, privacidade), do banco
    if (contaSessao) this.v109DaSessao(contaSessao.idPublico, r.silencio);   // v109: o silêncio da equipe, do banco (a sessão é a palavra final)
    const c = {ws, id:null, brasil:false, brasilId:null, nome:'Jogador', skin:'', flag:'BR', avatar:null, conta:null, contaSessao, selo:'', sala:null, p2p:false,
      ip, baldes:{}, substituido:false, ultBrasil:0, ultTextoBrasil:'', clubeAnunciado:null};
    ws.vivo = true;
    this.clientes.add(c);
    c.prazoHello = setTimeout(() => {                   // v100: quem não se apresenta não fica ocupando lugar
      if (!c.id && !c.brasil && this.clientes.has(c)){ try { c.ws.close(4008, 'sem hello'); } catch (_) {} }
    }, PRAZO_HELLO_MS);
    if (c.prazoHello.unref) c.prazoHello.unref();
    ws.on('message', txt => { ws.vivo = true; try { this.recebe(c, txt); } catch (e) { this.log('erro tratando mensagem: ' + (e && e.stack || e)); } });
    ws.on('close', () => this.fechou(c));
    return c;
  }
  manda(c, obj){ return this.mandaTxt(c, JSON.stringify(obj)); }
  mandaTxt(c, txt){
    const ws = c && c.ws;
    if (!ws || ws.readyState !== 1) return false;
    if (ws.bufferedAmount > 2e6) return false;           // (conexão entupida: o quadro velho não serve mais)
    return ws.send(txt);
  }
  erro(c, message, codigo){ this.manda(c, codigo ? {type:'error', message, codigo} : {type:'error', message}); }
  balde(c, k, porSeg, max){                              // limite de ritmo (balde de fichas) por conexão
    const agora = Date.now(); let b = c.baldes[k];
    if (!b) b = c.baldes[k] = {t:agora, n:max};
    b.n = Math.min(max, b.n + (agora - b.t)/1000*porSeg); b.t = agora;
    if (b.n < 1) return false;
    b.n -= 1; return true;
  }
  recebe(c, txt){
    if (typeof txt !== 'string') return;
    if (txt.length > 65536){                             // v92 · OFICINA: só o mapa (até 180 KB + a miniatura) passa disso, devagar
      if (txt.length > 400000 || !/^\{"type":"(mapa_req|create|config)"/.test(txt) || !this.balde(c, 'grande', .5, 3)) return;
    }
    let m; try { m = JSON.parse(txt); } catch (_) { return; }
    if (!m || typeof m !== 'object' || typeof m.type !== 'string') return;
    if (txt.length > 65536 && m.type !== 'mapa_req' && m.type !== 'create' && m.type !== 'config') return;   // (o "type" do começo pode vir repetido no meio: vale o que o JSON leu)
    const t = m.type;
    if (t === 'input') return this.input(c, m);
    if (t === 'snapshot') return this.snapshot(c, m);
    if (t.startsWith('auto_')){                          // v83: os comandos da partida autoritativa · v100: com ritmo (o comando da
      if (!this.balde(c, t === 'auto_cmd' ? 'auto' : 'geral', t === 'auto_cmd' ? 90 : 30, t === 'auto_cmd' ? 180 : 90)) return;   // partida até 90/s; o resto, o geral)
      return this.auto.recebe(c, m);
    }
    if (!this.balde(c, 'geral', 30, 90)) return;
    if (t.startsWith('brasil_')) return this.brasilRecebe(c, m);
    if (t === 'ping'){ if (m.ms != null && Number.isFinite(+m.ms)) c.ms = Math.max(0, Math.min(9999, Math.round(+m.ms))); return this.manda(c, {type:'pong', time:m.time}); }   // v93: + o ping que o aparelho mediu (o painel de jogadores)
    if (t === 'hello') return this.hello(c, m);
    if (!c.id) return;
    const f = Turma.ACOES[t]; if (f) this[f](c, m);
  }
  fechou(c){
    if (!this.clientes.delete(c)) return;
    clearTimeout(c.prazoHello);
    if (c.ip){ const n = (this.porIp.get(c.ip) || 1) - 1; if (n > 0) this.porIp.set(c.ip, n); else this.porIp.delete(c.ip); }   // v100
    this.auto.sair(c, true);                           // v83: caiu da partida autoritativa (o lugar fica para a reconexão)
    if (c.id && this.filaEsp.get(c.id) && this.filaEsp.get(c.id).c === c) this.filaEsp.delete(c.id);   // v79: caiu procurando: sai da fila
    if (c.brasil) this.brasilOnline();
    if (!c.id) return;
    if (this.porId.get(c.id) === c) this.porId.delete(c.id);
    if (c.substituido) return;                           // (a conexão nova do mesmo jogador ficou com a sala)
    this.v88Saiu(c);                                     // v88: os amigos veem offline
    if (c.sala) this.sai(c, 'caiu');
    this.listaMudou();
  }
  batimento(){                                           // a cada 15 s: quem não respondeu cai; sala vazia some
    for (const c of this.clientes){
      if (!c.ws.vivo){ try { c.ws.terminate(); } catch (_) {} continue; }
      c.ws.vivo = false; try { c.ws.ping(); } catch (_) {}
    }
    const agora = Date.now();
    for (const r of this.salas.values()){
      for (const [id, v] of r.reservas) if (v.ate < agora) r.reservas.delete(id);
      for (const [id, t] of r.removidos) if (t < agora) r.removidos.delete(id);
      if (!r.members.some(x => !x.bot) && r.vaziaAte < agora) this.fechaSala(r);
    }
    for (const [id, t] of this.chat.silencio) if (t < agora) this.chat.silencio.delete(id);
    this.v88Poda();                                      // v88: o histórico velho dos chats novos (a cada 10 min)
  }
  status(){ const mp = this.mapas.resumo(); return {ok:true, nome:this.nome, salas:this.salas.size, online:this.porId.size, chat:[...this.clientes].filter(c => c.brasil).length, clubes:Object.keys(this.b.d.clubes).length, auto:this.auto.resumo(), mapas:{mapas:mp.mapas, salvos:mp.pasta !== 'memória'}}; }   // v83: + as partidas autoritativas no /saude · v92: + o catálogo da Oficina · v100: sem a pasta do disco (o /saude é público)   // v83: + as partidas autoritativas no /saude · v92: + o catálogo da Oficina
  fecha(){ this.auto.fecha(); clearInterval(this.relogio); clearInterval(this.cronoT); clearTimeout(this.listaT); clearTimeout(this.filaT); for (const c of this.clientes) try { c.ws.close(1001, 'servidor desligando'); } catch (_) {} this.b.salvaJa(); this.mapas.fecha(); }

  /* v100 (segurança): a conta foi suspensa, banida ou excluída na plataforma — as conexões dela caem na hora (saem da sala
     como quem caiu: o bot assume a tampinha) e o bilhete assinado ANTES disso não abre outra. O bilhete novo, a plataforma só dá
     quando a conta voltar (o fim da suspensão, o RACHA CONTROL tirando a punição, a conta nova com o mesmo número depois do
     ZERAR CONTAS) — e esse entra. ("ate" fica pela compatibilidade: quem decide até quando é a plataforma.) */
  derrubaConta(pub, ate, motivo){
    const p = String(Number(pub)).padStart(6, '0'), id = 'c' + Number(pub);
    if (!/^\d{1,9}$/.test(String(pub))) return 0;
    for (const [k, t] of this.punidas) if (Date.now() - t > PUNIDAS_MS) this.punidas.delete(k);
    this.punidas.set(p, Date.now());
    let caiu = 0;
    for (const c of [...this.clientes]){
      const conta = c.id || (c.contaSessao ? 'c' + Number(c.contaSessao.idPublico) : null);
      if (conta !== id && c.brasilConta !== id) continue;
      this.erro(c, motivo || 'Esta conta está suspensa no RACHA.', 'conta_suspensa');
      try { this.fechou(c); } catch (_) {}
      try { c.ws.close(4003, 'conta suspensa'); } catch (_) {}
      caiu++;
    }
    if (caiu) this.log('conta ' + p + ' saiu das salas (suspensa/banida na plataforma): ' + caiu + ' conexão(ões)');
    return caiu;
  }
  bilheteDeAntes(c, conta){                              // v100: o bilhete foi assinado antes da punição? (a sessão do site, montada
    if (!conta || conta === c.contaSessao) return false;   // aqui, já é conferida pela plataforma a cada conexão)
    const d = this.punidas.get(conta.idPublico);
    return !!d && Date.now() - d <= PUNIDAS_MS && (conta.t || 0) <= d;
  }

  /* ------------------------------------------------------------------ quem é quem */
  bilhete(txt){                                          // o bilhete da conta do RACHA (assinado pela plataforma)
    const o = confere(this.segredo, txt);
    if (!o || !/^\d{1,9}$/.test(String(o.p)) || typeof o.n !== 'string') return null;
    return {idPublico:String(Number(o.p)).padStart(6, '0'), nome:limpa(o.n, 20) || 'Jogador', selo:seloDe(o.s), rel:social88.relDoBilhete(o), t:Number(o.t) || 0, silencio:silencio109.silencioDoBilhete(o)};   // v109: + o silêncio da equipe (z, zm)   // v100: + quando foi assinado (t)   // v79: o selo vem assinado (s: a lista da conta) · v88: e as relações (a, b, o, c, k, q)
  }
  gente(id){
    let g = this.b.d.gente[id];
    if (!g){
      if (this.b.d.seq.pub < 9000000) this.b.d.seq.pub = 9000000;                     // v82: os IDs de quem joga sem conta têm 7 dígitos (9.000.001…): não batem com os das contas (6 dígitos)
      g = this.b.d.gente[id] = {id, pub:0, nome:'Jogador', skin:'', flag:'BR', criado:Date.now(), visto:0, conta:null, clube:null, st:{jogos:0, vit:0, der:0, emp:0, gols:0}};
      g.pub = id[0] === 'c' ? Number(id.slice(1)) : ++this.b.d.seq.pub;
    }
    return g;
  }
  hello(c, m){
    if (c.id) return;
    const conta = c.contaSessao || this.bilhete(m.conta);
    if (this.bilheteDeAntes(c, conta)){                 // v100: a conta suspensa/banida não volta com um bilhete de antes
      this.erro(c, 'Esta conta está suspensa no RACHA.', 'conta_suspensa');
      try { c.ws.close(4003, 'conta suspensa'); } catch (_) {}
      return;
    }
    if (conta && conta !== c.contaSessao) this.v109DoBilhete(conta);   // v109: o silêncio da equipe que veio no bilhete
    // v84: login obrigatório — sem conta válida (sessão da plataforma ou bilhete assinado) a conexão é recusada.
    if (this.exigeConta && !conta){
      this.erro(c, 'Para jogar online você precisa entrar na sua conta do RACHA.', 'sem_conta');
      try { c.ws.close(4001, 'login obrigatorio'); } catch (_) {}
      return;
    }
    let tok = typeof m.token === 'string' && m.token.length >= 16 && m.token.length <= 80 ? m.token : null;
    let id = conta ? 'c' + Number(conta.idPublico) : tok ? this.b.d.tokens[sha(tok)] || null : null;
    // v100 (segurança): o lugar de uma CONTA só com a conta (a sessão do site ou o bilhete assinado). O token do aparelho de
    // quem já entrou com a conta continuava valendo depois de sair dela: quem abrisse o jogo sem conta no mesmo aparelho virava
    // aquela conta nas salas (os troféus da turma, o chat do clube). Sem a conta, esse token vale como o de um visitante novo.
    if (!conta && id && id[0] === 'c') id = null;
    if (!id) id = novoId('u', 9);
    if (!tok || this.b.d.tokens[sha(tok)] !== id){ tok = novoToken(); this.b.d.tokens[sha(tok)] = id; }
    const g = this.gente(id);
    g.nome = conta ? conta.nome : limpaNome(m.name); g.skin = skinOk(m.skin) || g.skin; g.flag = flagOk(m.flag) || g.flag || 'BR';
    g.visto = Date.now(); if (conta) g.conta = conta.idPublico;
    this.b.marca();
    Object.assign(c, {id, conta:conta ? {idPublico:conta.idPublico, nome:conta.nome, selo:conta.selo} : null, selo:conta ? conta.selo || '' : '', nome:g.nome, skin:g.skin, flag:g.flag, avatar:avatarOk(m.avatar), clubeAnunciado:clubeAnunciado(m.clube)});
    c.v93 = m.v93 === 1;                                 // v93: o aparelho conhece a contagem e o replay (a página antiga guardada no aparelho, não)
    c.v94 = m.v94 === 1;                                 // v94: o aparelho tem o motor próprio (entende o m94 dos quadros)
    c.rch = m.rch === 1;                                 // v98: o aparelho conhece as salas do Rachão (a página antiga guardada num aparelho, não)
    c.cr99 = m.cr === 1;                                 // v99: o aparelho conhece os chutes do Rachão nas salas (cavadinha, curva e super)
    // v105: a física das salas mudou (o jogo de corpo e a virada na hora, no núcleo): a página do jogo de antes (a v93 até a
    // v104 — o app guardado no fundo, a aba esquecida) preveria a sua tampinha com a física velha (trancos a cada virada). Ela
    // não entra nas salas do RACHA nem na ranqueada: o aviso diz para atualizar. (Quem não manda o v93 não é a página do jogo.)
    c.velho105 = c.v93 && m.v105 !== 1;
    const velho = this.porId.get(id);
    if (velho && velho !== c){                           // o mesmo jogador abriu de novo (voltou a internet, ou outra aba): a nova fica
      velho.substituido = true;
      if (velho.sala) c.sala = velho.sala;
      this.erro(velho, 'O jogo foi aberto em outra aba ou aparelho com este perfil: esta aqui parou de receber.', 'outra_aba');
      try { velho.ws.close(4000, 'outra aba'); } catch (_) {}
    }
    this.porId.set(id, c);
    const msg = {type:'hello', id, token:tok, server:{name:this.nome}, p2p:this.p2p, pub:String(g.pub).padStart(6, '0'), conta:!!conta, selo:c.selo || ''};   // v79: + o seu selo (o V na frente do nome; vem da conta, nunca do jogo)
    if (this.ice) msg.ice = this.ice;
    if (RCH) msg.rch = 1;                              // v98: este servidor tem as salas do Rachão (o aparelho só oferece criar quando tem)
    msg.cr = 1;                                        // v99: e os chutes do Rachão nas salas personalizadas
    this.manda(c, msg);
    this.manda(c, this.listaMsg(c));
    const resume = c.sala ? this.salas.get(c.sala) : null;
    if (c.sala && !(resume && resume.members.some(x => x.id === id))) c.sala = null;
    this.v88Entrou(c, conta);                            // v88: as relações da conta, a lista dos amigos online e o status para eles
    if (c.sala && ((this.temChutes(resume) && !c.cr99) || (resume.rachao && !c.rch))){   // v99: a página antiga (outra aba, o app guardado) não
      const rch = !!resume.rachao;                       // volta para a sala com os chutes do Rachão (nem para a do Rachão): sai como quem caiu
      this.sai(c, 'caiu');                               // (o lugar fica guardado 90 s para a página nova) e o aviso diz para atualizar
      this.erro(c, rch ? 'Esta é uma sala do Rachão: atualize o jogo (recarregue a página) para entrar.' : 'Esta sala tem os chutes do Rachão: atualize o jogo (recarregue a página) para entrar.', rch ? 'rachao_velho' : 'chutes_velho');
    } else if (c.sala && resume && !resume.rachao && c.velho105){   // v105: a página de antes não volta para a sala do RACHA
      this.sai(c, 'caiu');
      this.erro(c, AVISO_V105, 'jogo_velho');
    }
    if (c.sala){                                         // ficou com a sala da conexão antiga: a tela dela volta
      const r = resume, eu = r.members.find(x => x.id === id);
      Object.assign(eu, {name:c.nome, selo:c.selo || '', skin:c.skin, flag:c.flag, avatar:c.avatar, club:this.cartaoClube(c), cos:this.v88Cos(c)});
      this.manda(c, {type:'sayHistory', list:this.v88HistSala(c, r)});   // v88: sem o texto escondido, sem bloqueados, sem a equipe dos outros
      if (r.state === 'playing' && r.host === id && !r.servidor) this.interrompe(r, 'Quem rodava a partida reconectou: a partida parou sem resultado.');
      if (r.state === 'playing' && r.partida && r.roster.includes(id)) r.partida.entra(id, c.nome, r.roster.indexOf(id));   // v83: reassume a tampinha (o bot sai) · v93: o mesmo lugar da sala
      if (r.custom) this.mandaMapaSala(c, r);            // v92 · OFICINA: o mapa da sala antes da tela dela
      if (r.rachao) this.mandaRachaoSala(c, r);          // v98: o campo da sala do Rachão antes da tela dela
      this.salaMuda(r);
      if (r.state === 'playing') this.manda(c, {type:'start', room:this.publica(r), resume:this.retomada(r)});
    }
  }

  /* ------------------------------------------------------------------ as salas */
  codigo(){ let s; do { s = ''; for (let i = 0; i < 6; i++) s += ALFA[Math.floor(Math.random()*ALFA.length)]; } while (this.salas.has(s)); return s; }
  salaDe(c){ return c.sala ? this.salas.get(c.sala) || null : null; }
  cartaoClube(c){ return this.clubes.cartao(c.id) || c.clubeAnunciado || null; }
  membro(c){ return {id:c.id, name:c.nome, selo:c.selo || '', flag:c.flag || 'BR', skin:c.skin, avatar:c.avatar, club:this.cartaoClube(c), cos:this.v88Cos(c), slot:-1, ready:false, rematch:false, banco:false}; }   // v93: banco = o reserva (quem assiste querendo entrar)   // v88: + os cosméticos equipados (cos: vêm da conta, assinados; só visual)
  publica(r){
    const srv = !!r.servidor;                        // v83: sala hospedada: ninguém é anfitrião; o criador é o admin
    return {code:r.code, name:r.name, host:srv ? 'srv' : r.host, admin:srv && !r.ranked ? r.host : null, servidor:srv, n:r.n, map:r.map, jogo:r.jogo, tempo:r.tempo, bots:r.bots, pub:r.pub, state:r.state, ranked:!!r.ranked,
      round:r.round, roster:r.roster, members:r.members, tournament:r.tournament ? {name:r.tournament.name, rounds:r.tournament.rounds, matches:r.tournament.matches, champion:r.tournament.champion} : null,
      oficial:false, regra:r.regra || '', relogio:r.regra === 'v80' && r.state === 'playing' ? this.relogioDe(r) : null,   // v80: a regra e o relógio do servidor
      nucleo:NUCLEO.VERSAO, fisica:srv ? this.fisicaDe(r) : null, quadros:this.quadrosDe(r), experimental:this.experimental,
      motor:srv && !r.custom && !r.rachao ? this.motorDe(r) : null, motorRodada:srv && r.partida && !r.custom && !r.rachao ? r.partida.motor : null,   // v94: o motor da sala e o da rodada que está rolando
      motor94:M94 ? M94.VERSAO : null, fisica94:srv && !r.custom && !r.rachao && (this.motorDe(r) === 'v94' || (r.partida && r.partida.motor === 'v94')) ? (r.partida && r.partida.R94 || this.resolvido94(r)) : null,   // v92: o perfil da física (a previsão do aparelho usa os mesmos números)
      E:r.E || 2, mapa:r.custom || null, rankOff:!!(r.custom && r.rankOff),   // v92 · OFICINA: a sala com mapa personalizado (o mapa vai separado, no mapa_sala; a partida é a PartidaMapa) · v95: o RANK OFF
      rachao:r.rachao ? this.rachaoPub(r) : null,       // v98: a sala do Rachão (o campo vai separado, no rachao_sala; a partida é a PartidaRachao)
      chutes:this.temChutes(r) ? r.chutes : null};      // v99: os chutes do Rachão ligados na sala (a partida joga no motor das salas de sempre)
  }
  decorrido(r){                                          // v80: o tempo de jogo da rodada no relógio do servidor (ms, sem as pausas)
    if (!r.inicio) return 0;
    const agora = this.agora();
    const ini0 = Math.min(r.pausa || Infinity, r.replay ? r.replay.t0 : Infinity), ini = ini0 < Infinity ? Math.max(ini0, r.inicio) : Infinity;   // v93: o replay do gol não conta (com a pausa junto, conta uma vez só; a pausa da contagem, só depois do começo)
    return Math.max(0, agora - r.inicio - r.pausadoMs - (ini < agora ? agora - ini : 0));
  }
  relogioDe(r){ return {ms:Math.round(this.decorrido(r)), pausado:!!(r.pausa || r.replay || r.contagem), seg:this.r80.seg, prorrog:this.r80.prorrog}; }
  relogios(){                                            // v80: a cada segundo, o relógio das partidas normais (e o fim que o anfitrião não mandou)
    this.painelTique = ((this.painelTique | 0) + 1) % 2; if (!this.painelTique) this.painels();   // v93: o painel de jogadores (a cada 2 s)
    for (const r of this.salas.values()){
      if (r.state !== 'playing' || r.regra !== 'v80') continue;
      this.todos(r, Object.assign({type:'relogio', round:r.round}, this.relogioDe(r)));
      if (r.servidor) continue;                          // v83: na sala hospedada o próprio motor encerra a partida no tempo
      if (r.pausa) continue;
      const el = this.decorrido(r)/1000, f = this.fim80(r);
      if (f.erro){ if (el >= this.r80.seg + this.r80.prorrog + TOL80.sozinho) this.encerra(r, r.ultimo ? r.ultimo.score.slice() : [0, 0], true); }
      else if (el >= f.at + TOL80.sozinho) this.encerra(r, f.s.slice(), true);
    }
  }
  fim80(r){                                              // v80: como a partida tem de acabar, pela linha do tempo dos gols → {s, at, ouro, aberto} ou {erro}
    let s = [0, 0], fim = null;
    const R8 = this.r80, lim = R8.seg + .5, limOT = R8.seg + R8.prorrog + .5;   // (meio segundo: o gol do último quadro antes da hora)
    if ((r.linha || []).length > TOL80.linha) return {erro:'o placar mudou vezes demais'};
    for (const g of r.linha || []){
      const real = g.ms/1000;
      if (real - g.el > TOL80.atraso || g.el - real > TOL80.adiante) return {erro:'o relógio do anfitrião não bate com o do servidor'};
      if (fim) return {erro:'gol depois do fim da partida'};
      if (g.s[0] < s[0] || g.s[1] < s[1]) return {erro:'o placar voltou para trás'};
      if (g.el >= lim){                                  // depois dos 3:00 só vale o GOL DE OURO (do 0 × 0, na prorrogação)
        if (s[0] || s[1]) return {erro:'gol depois do tempo'};
        if (g.el >= limOT) return {erro:'gol depois da prorrogação'};
        s = g.s.slice(); fim = {s, at:g.el, ouro:true}; continue;
      }
      s = g.s.slice();
      if (Math.max(s[0], s[1]) >= R8.meta) fim = {s, at:g.el};
    }
    return fim || {s, at:s[0] || s[1] ? R8.seg : R8.seg + R8.prorrog, aberto:true};
  }
  retomada(r){ const u = r.ultimo; return {score:u ? u.score.slice() : [0, 0], tick:u ? u.tick : 0, elapsed:u ? u.elapsed : 0}; }
  todos(r, obj, exceto){
    const txt = JSON.stringify(obj);
    for (const x of r.members){
      if (x.bot || (exceto && x.id === exceto.id)) continue;
      const cl = this.porId.get(x.id); if (cl && cl.sala === r.code) this.mandaTxt(cl, txt);
    }
  }
  salaMuda(r){ this.todos(r, {type:'room', room:this.publica(r)}); this.listaMudou(); this.v88MarcaSala(r); }   // v88: + o status de quem está nela para os amigos
  diz(r, msg){ r.hist.push(msg); if (r.hist.length > 40) r.hist.shift(); this.todos(r, msg); }
  livre(r, t){ for (let k = 0; k < r.n; k++){ const i = t*r.n + k; if (!r.roster[i]) return i; } return -1; }
  senta(r, m, slot){
    if (m.slot >= 0 && r.roster[m.slot] === m.id) r.roster[m.slot] = null;
    m.slot = slot; m.ready = false; if (slot >= 0) r.roster[slot] = m.id;
  }
  novoN(r, n, E){                                        // mudou o tamanho dos times: quem cabe fica no lugar, o resto assiste
    const vn = r.n, ve = r.E || 2; E = E || ve; r.n = n; if (r.E || E !== 2) r.E = E; r.roster = new Array(E*n).fill(null);   // (v92 · OFICINA: e o número de times)
    for (const m of r.members){
      if (m.slot < 0) continue;
      const t = Math.floor(m.slot/vn), k = m.slot % vn;
      if (k < n && t < E){ m.slot = t*n + k; r.roster[m.slot] = m.id; } else { m.slot = -1; m.ready = false; }
    }
  }
  listaMsg(cap){                                         // v98: a página antiga (sem as salas do Rachão) recebe a lista sem elas · v99: nem as com os chutes do Rachão
    const list = [], comRachao = cap === true || !!(cap && cap.rch), comCr = !!(cap && cap.cr99);
    for (const r of this.salas.values()){
      if (!r.pub || !r.members.some(x => !x.bot)) continue;
      if (r.rachao && !comRachao) continue;
      if (this.temChutes(r) && !comCr) continue;
      const dono = r.members.find(x => x.id === r.host);
      if (r.ranked) continue;                            // v79: a ranqueada não aparece na lista
      const em = r.state === 'playing';
      list.push({code:r.code, name:r.name, flag:dono ? dono.flag : 'BR', selo:dono ? dono.selo || '' : '', n:r.n, jogo:r.jogo, map:r.map, tempo:r.tempo, bots:r.bots, state:r.state,
        cup:!!r.tournament, oficial:false, players:r.roster.filter(Boolean).length, max:2*r.n, people:r.members.length,
        placar:em && r.ultimo ? r.ultimo.score.slice() : null, assistir:em && r.members.length < (r.custom || r.rachao ? MAX_GENTE_MAPA : MAX_GENTE),   // v88: o placar de quem está jogando (para ASSISTIR)
        E:r.E || 2, mapa:r.custom ? {nome:r.custom.nome, codigo:r.custom.naoListado ? '' : r.custom.codigo, autor:r.custom.autor, fisica:!!r.custom.fisicaSala} : null, rankOff:!!(r.custom && r.rankOff),   // v92 · OFICINA · v95: o RANK OFF
        rachao:r.rachao ? {nome:r.rachao.info.nome, estadio:!!r.rachao.info.estadio, modo:r.rachao.opc.modo, resumo:RCH.resumo(r.rachao.info, r.rachao.opc, r.n)} : null,   // v98: a sala do Rachão
        chutes:this.temChutes(r) ? r.chutes : null});     // v99: os chutes do Rachão ligados na sala
      if (r.custom) list[list.length - 1].max = r.roster.length;
      if (list.length >= 100) break;
    }
    return {type:'rooms', list, online:this.porId.size};
  }
  listaMudou(){                                          // quem está na lista de salas (fora de sala) vê a lista nova (no máximo 2 por segundo)
    if (this.listaT) return;
    this.listaT = setTimeout(() => {
      this.listaT = null;
      const ja = new Map();                              // v98/v99: uma lista por jeito de aparelho (com ou sem as salas do Rachão e os chutes)
      for (const c of this.porId.values()) if (!c.sala){
        const k = (c.rch ? 1 : 0) | (c.cr99 ? 2 : 0);
        let t = ja.get(k); if (!t) ja.set(k, t = JSON.stringify(this.listaMsg(c)));
        this.mandaTxt(c, t);
      }
    }, 500);
  }
  interrompe(r, message){
    if (r.pausa){ this.v93Some(r, r.pausa, r.replay ? r.replay.t0 : null); r.pausa = null; }
    r.state = 'waiting'; r.interrompida = r.round;
    this.todos(r, {type:'interrupted', message});
  }
  fechaSala(r){ this.salas.delete(r.code); this.log('sala ' + r.code + ' fechou'); this.listaMudou(); }
  sai(c, motivo){                                        // saiu, caiu ou foi removido
    const r = this.salaDe(c); c.sala = null;
    if (!r) return;
    this.v88Marca(c);                                    // v88: o status para os amigos (saiu da sala)
    const eu = r.members.find(x => x.id === c.id); if (!eu) return;
    if (eu.slot >= 0 && r.roster[eu.slot] === eu.id) r.roster[eu.slot] = null;
    r.members = r.members.filter(x => x !== eu);
    if (motivo === 'caiu' && eu.slot >= 0) r.reservas.set(eu.id, {slot:eu.slot, ate:Date.now() + 90000, nome:eu.name});   // volta para o mesmo lugar (90 s) · v93: + o nome (o painel)
    if (r.partida) r.partida.sai(eu.id);               // v83: um bot assume a tampinha NA HORA — a partida não para por ninguém
    const gente = r.members.filter(x => !x.bot);
    if (!gente.length){
      this.abortaPartida(r);                           // v83: sem ninguém para jogar, a partida acaba sem resultado
      if (r.state === 'playing') r.state = 'waiting';
      if (motivo === 'caiu'){ r.vaziaAte = Date.now() + 90000; this.listaMudou(); return; }   // (quem caiu pode voltar)
      this.fechaSala(r); return;
    }
    if (r.host === eu.id){                               // o dono saiu: a sala passa para quem está há mais tempo (o árbitro decide o resto)
      r.host = gente[0].id;
      if (r.state === 'playing' && !r.servidor) this.interrompe(r, motivo === 'caiu' ? 'Quem rodava a partida caiu: a partida parou sem resultado.' : 'Quem rodava a partida saiu: a partida parou sem resultado.');
      // v83: na sala hospedada só a função de admin muda de mão — a partida segue normalmente (a REGRA FUNDAMENTAL)
      if (r.servidor && r.pausa){                        // quem pausou foi embora: a partida dos outros não fica congelada
        this.v93Some(r, r.pausa, r.replay ? r.replay.t0 : null); r.pausa = null;
        if (r.partida) r.partida.pausado = !!(r.contagem || r.replay);   // v93: (a contagem e o replay continuam)
        this.todos(r, {type:'pause', paused:false});
      }
    }
    this.diz(r, {type:'say', sys:true, who:eu.id, text:eu.name + (motivo === 'kick' ? ' foi removido da sala' : motivo === 'caiu' ? ' caiu (pode voltar)' : ' foi embora da sala'), t:Date.now()});
    this.salaMuda(r);
    if (r.replay) this.replayConfere(r);                 // v93: quem saiu não conta mais na votação do replay
    this.painelLogo(r);
  }
  clubeMudou(id){                                        // entrou, saiu ou o clube mudou: o escudo no cartão da sala acompanha
    const c = this.porId.get(id); if (!c || !c.sala) return;
    const r = this.salaDe(c), eu = r && r.members.find(x => x.id === id);
    if (eu){ eu.club = this.cartaoClube(c); this.salaMuda(r); }
  }

  /* ------------------------------------------------------------------ o que o jogo manda (a sala) */
  list(c){ this.manda(c, this.listaMsg(c)); }
  create(c, m){
    if (!this.balde(c, 'criaSala', .2, 3)) return this.erro(c, 'Calma: espere um pouco para criar outra sala.');
    if (this.salas.size >= MAX_SALAS) return this.erro(c, 'O servidor está cheio de salas agora. Tente daqui a pouco.');
    if (m.rachao) return this.criaRachao(c, m);         // v98: a sala do Rachão (o campo e as opções; a partida no motor do Rachão)
    if (c.velho105) return this.erro(c, AVISO_V105, 'jogo_velho');   // v105: a página de antes (a física das salas mudou)
    let mp = null;                                       // v92 · OFICINA: a sala com um mapa publicado (m.mapa) ou com o rascunho do editor (m.mapaDados)
    if (m.mapa || m.mapaDados){ mp = this.mapaDaSala(c, m); if (mp.erro) return this.erro(c, mp.erro, 'mapa'); }
    const fx = mp && m.fisicaSala ? this.comFisicaSala(mp.mapa, m.fisicaSala) : null;   // (a física da sala, escolhida no CRIAR SALA)
    if (fx && fx.erro) return this.erro(c, fx.erro, 'mapa');
    if (c.sala) this.sai(c, 'saiu');
    const n = mp ? inteiro(m.n, mp.porMin, mp.porMax, mp.porTime) : inteiro(m.n, 1, 4, 2), E = mp ? mp.E : 2;
    const r = {code:this.codigo(), name:limpa(m.name, 24) || (mp ? limpa(mp.info.nome, 24) : 'Racha de ' + c.nome), host:c.id, n, map:MAPAS_SALA.includes(m.map) ? m.map : MAPAS_SALA[0],
      jogo:mp ? mp.jogo : MODOS_SALA.includes(m.jogo) ? m.jogo : 'futebol', tempo:mp ? mp.tempo : TEMPOS.includes(m.tempo) ? m.tempo : 0, bots:false,   // v103: as salas personalizadas não têm bots
      pub:m.pub !== false && !(mp && mp.privado), servidor:true,
      state:'waiting', round:0, roster:new Array(E*n).fill(null), members:[], tournament:null, hist:[], reservas:new Map(), removidos:new Map(),
      inicio:0, pausa:null, pausadoMs:0, ultimo:null, gols:{}, encerrada:-1, interrompida:-1, vaziaAte:0, criada:Date.now()};
    if (mp){ r.E = E; r.custom = mp.info; r.mapaDados = r.mapaBase = mp.mapa; if (fx && fx.fisica) this.poeFisicaSala(r, fx); r.rankOff = m.rankOff === true && !linhasDoMapa(mp.mapa); }   // v95: o RANK OFF (as linhas da bola; não conta nas jogadas do mapa) — o mapa que já tem as linhas para todos não precisa
    else if (m.chutes && c.cr99) this.poeChutes(r, m.chutes);   // v99: os chutes do Rachão (cavadinha, curva, super)
    this.salas.set(r.code, r); c.sala = r.code;
    const eu = this.membro(c); r.members.push(eu); this.senta(r, eu, 0);   // quem cria começa no Time A (o jogo põe o árbitro assistindo) · v80: Time A (laranja) × Time B (roxo)
    this.manda(c, {type:'sayHistory', list:[]});
    if (r.custom) this.mandaMapaSala(c, r);
    this.salaMuda(r);
    this.diz(r, {type:'say', sys:true, who:c.id, text:eu.name + ' chegou na sala', t:Date.now()});
    this.log('sala ' + r.code + ' criada por ' + c.nome + (r.pub ? ' (aberta)' : ' (fechada)'));
  }
  /* ------------------------------------------------------------------ v98: as salas online do Rachão
     create {rachao:{campo | estadio, modo, tempo, gols, corrida, nivel, chutes}, n, bots, pub, name}: o campo (um dos 17 ou um
     estádio da Oficina de estádios, limpo aqui com o código da própria página) e as opções conferidas; a sala é do servidor
     (servidor: true), com 2 times (Vermelho × Azul) de 1 a 7. O campo vai para cada aparelho no rachao_sala (como o mapa_sala
     das salas com mapa); a partida (PartidaRachao) manda os quadros no rq; o resultado vale para a sala (sem selo, XP nem
     troféu, como nas salas com mapa: a física e o campo são de quem criou). A página antiga (sem rch no hello) não entra. */
  criaRachao(c, m){
    if (!RCH) return this.erro(c, 'Este servidor ainda não tem as salas do Rachão (falta atualizar o servidor das salas).', 'rachao');
    if (!c.rch) return this.erro(c, 'Atualize o jogo (recarregue a página) para criar sala do Rachão.', 'rachao_velho');
    const rc = this.rachaoDaSala(m.rachao); if (rc.erro) return this.erro(c, rc.erro, 'rachao');
    if (c.sala) this.sai(c, 'saiu');
    const n = inteiro(m.n, 1, RCH.MAX_POR_TIME, rc.info.def || 2);
    const r = {code:this.codigo(), name:limpa(m.name, 24) || limpa('Rachão de ' + c.nome, 24), host:c.id, n, map:MAPAS_SALA[0], jogo:'rachao', tempo:0, bots:false,   // v103: sem bots
      pub:m.pub !== false, servidor:true, state:'waiting', round:0, roster:new Array(2*n).fill(null), members:[], tournament:null, hist:[], reservas:new Map(), removidos:new Map(),
      inicio:0, pausa:null, pausadoMs:0, ultimo:null, gols:{}, encerrada:-1, interrompida:-1, vaziaAte:0, criada:Date.now(), rachao:rc};
    this.salas.set(r.code, r); c.sala = r.code;
    const eu = this.membro(c); r.members.push(eu); this.senta(r, eu, 0);   // (quem cria começa no Vermelho)
    this.manda(c, {type:'sayHistory', list:[]});
    this.mandaRachaoSala(c, r);
    this.salaMuda(r);
    this.diz(r, {type:'say', sys:true, who:c.id, text:eu.name + ' chegou na sala', t:Date.now()});
    this.log('sala ' + r.code + ' do Rachão criada por ' + c.nome + ' (' + (rc.info.campo || 'estádio ' + rc.info.hash) + ', ' + rc.opc.modo + (r.pub ? ', aberta)' : ', fechada)'));
  }
  rachaoDaSala(o){                                      // o campo e as opções que chegaram (tudo conferido aqui; o nome do estádio passa pelo filtro do chat)
    o = o && typeof o === 'object' && !Array.isArray(o) ? o : {};
    const e = RCH.estadioDaSala(o, filtrado); if (e.erro) return e;
    return {info:e.info, mapa:e.mapa, doc:e.doc, opc:RCH.opcoesDaSala(o)};
  }
  rachaoPub(r){ const rc = r.rachao; return {info:rc.info, opc:rc.opc, resumo:RCH ? RCH.resumo(rc.info, rc.opc, r.n) : '', lugares:r.partida && r.partida.lugares ? r.partida.lugares : null}; }
  mandaRachaoSala(c, r){ if (r.rachao) this.mandaTxt(c, this.rachaoSalaTxt(r)); }
  rachaoSalaTxt(r){                                     // (o rachao_sala já pronto em texto: quem entra recebe o mesmo, sem refazer o JSON do estádio)
    const rc = r.rachao;
    if (r._rsTxt && r._rsK === rc && r._rsC === r.code) return r._rsTxt;
    r._rsTxt = JSON.stringify({type:'rachao_sala', code:r.code, hash:rc.info.hash, info:rc.info, campo:rc.info.campo || '', estadio:rc.doc || null}); r._rsK = rc; r._rsC = r.code;
    return r._rsTxt;
  }
  configRachao(c, r, m){                                // o admin mexe na sala do Rachão entre as partidas: o campo, as opções, o tamanho, os bots
    let rc = null;
    if (m.rachao && typeof m.rachao === 'object'){
      if (!this.balde(c, 'trocaMapa', .5, 4)) return this.erro(c, 'Calma: espere um pouco para mudar a sala de novo.');
      const o = m.rachao, novo = o.campo || o.estadio ? this.rachaoDaSala(o) : {info:r.rachao.info, mapa:r.rachao.mapa, doc:r.rachao.doc, opc:RCH.opcoesDaSala(o)};
      if (novo.erro) return this.erro(c, novo.erro, 'rachao');
      rc = novo;
    }
    const trocou = !!(rc && rc.info.hash !== r.rachao.info.hash);
    if (rc) r.rachao = rc;
    if (Number.isInteger(m.n) && m.n !== r.n && m.n >= 1 && m.n <= RCH.MAX_POR_TIME) this.novoN(r, m.n, 2);
    // (v103: os bots não voltam pela configuração: as salas personalizadas não têm bots)
    if (typeof m.pub === 'boolean') r.pub = m.pub;
    if (typeof m.name === 'string' && limpa(m.name, 24)) r.name = limpa(m.name, 24);
    if (trocou) for (const x of r.members){ const cl = this.porId.get(x.id); if (cl && cl.sala === r.code) this.mandaRachaoSala(cl, r); }
    this.salaMuda(r);
  }
  join(c, m){
    const code = String(m.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6), r = this.salas.get(code);
    if (!r) return this.erro(c, 'Sala não encontrada. Confira o código (ela fecha quando todo mundo sai).');
    if (r.rachao && !c.rch) return this.erro(c, 'Esta é uma sala do Rachão: atualize o jogo (recarregue a página) para entrar.', 'rachao_velho');   // v98
    if (this.temChutes(r) && !c.cr99) return this.erro(c, 'Esta sala tem os chutes do Rachão: atualize o jogo (recarregue a página) para entrar.', 'chutes_velho');   // v99
    if (!r.rachao && c.velho105) return this.erro(c, AVISO_V105, 'jogo_velho');   // v105: a página de antes (a física das salas mudou)
    const rem = r.removidos.get(c.id);
    if (rem && rem > Date.now()) return this.erro(c, 'Você foi removido desta sala. Espere um pouco para voltar.');
    if (r.ranked && !r.members.some(x => x.id === c.id) && !r.reservas.has(c.id)) return this.erro(c, 'Essa é uma partida ranqueada: entre pela busca do JOGAR.');
    if (c.sala && c.sala !== code) this.sai(c, 'saiu');
    let eu = r.members.find(x => x.id === c.id);
    const novo = !eu;
    if (novo){
      const maxG = r.custom || r.rachao ? MAX_GENTE_MAPA : MAX_GENTE;   // (v98: a sala do Rachão cabe 7x7 + quem assiste)
      if (r.members.length >= maxG) return this.erro(c, 'A sala está cheia (' + maxG + ' pessoas).');
      if (r.custom && r.mapaDados && r.mapaDados.partida.espectadores === false && !r.reservas.has(c.id)){   // v92 · OFICINA: o mapa sem espectadores
        if (r.state === 'playing') return this.erro(c, 'Esta sala não aceita quem só assiste: espere a partida acabar.');
        if (!r.roster.some(x => !x)) return this.erro(c, 'A sala está cheia e não aceita quem só assiste.');
        m = Object.assign({}, m, {rapido:true});
      }
      eu = this.membro(c); r.members.push(eu);
    } else Object.assign(eu, {name:c.nome, selo:c.selo || '', skin:c.skin, flag:c.flag, avatar:c.avatar, club:this.cartaoClube(c), cos:this.v88Cos(c)});
    c.sala = code;
    const res = r.reservas.get(c.id); r.reservas.delete(c.id); r.vaziaAte = 0;
    if (r.state === 'playing'){
      if (res && Number.isInteger(m.slot) && m.slot === res.slot && !r.roster[m.slot]) this.senta(r, eu, m.slot);   // voltou para o lugar dele no meio da partida
      if (!novo && r.partida && r.roster.includes(c.id)) r.partida.entra(c.id, c.nome, r.roster.indexOf(c.id));   // v83: reassume a tampinha (o bot sai) · v93: o mesmo lugar da sala
      if (novo && r.partida && res && r.roster.includes(c.id)) r.partida.entra(c.id, c.nome, r.roster.indexOf(c.id));
    }
    if (novo && r.state === 'playing'){
      // (lugar recuperado acima; espectador novo no meio da partida só assiste)
    } else if (novo && !r.tournament){
      if (m.rapido){                                     // JOGAR AGORA: um lugar no time com menos gente (o árbitro ainda pode mudar) · v92: com até 4 times
        const E = r.E || 2, conta = t => r.roster.slice(t*r.n, (t + 1)*r.n).filter(Boolean).length;
        const ordem = Array.from({length:E}, (_, t) => t).sort((x, y) => conta(x) - conta(y) || x - y);
        const t = ordem.find(x => this.livre(r, x) >= 0), s = t == null ? -1 : this.livre(r, t);
        if (s >= 0) this.senta(r, eu, s);
      } else if (Number.isInteger(m.slot) && m.slot >= 0 && m.slot < r.roster.length && !r.roster[m.slot] && !m.spectate) this.senta(r, eu, m.slot);
    }
    if (!r.members.some(x => x.id === r.host)) r.host = c.id;   // (sala que ficou vazia esperando: quem volta é o dono)
    this.manda(c, {type:'sayHistory', list:this.v88HistSala(c, r)});   // v88: sem o texto escondido, sem bloqueados, sem a equipe dos outros
    if (r.state === 'playing' && r.host === c.id && !r.servidor) this.interrompe(r, 'Quem rodava a partida reconectou: a partida parou sem resultado.');
    if (r.custom) this.mandaMapaSala(c, r);              // v92 · OFICINA: o mapa da sala chega antes da tela dela
    if (r.rachao) this.mandaRachaoSala(c, r);            // v98: o campo da sala do Rachão também
    this.salaMuda(r);
    if (novo) this.diz(r, {type:'say', sys:true, who:c.id, text:eu.name + ' chegou na sala', t:Date.now()});
    if (r.state === 'playing') this.manda(c, {type:'start', room:this.publica(r), resume:this.retomada(r)});
  }
  leave(c){ if (c.sala) this.sai(c, 'saiu'); this.manda(c, {type:'left'}); }
  seat(c, m){
    const r = this.salaDe(c); if (!r) return;
    const eu = r.members.find(x => x.id === c.id); if (!eu) return;
    if (r.ranked) return this.erro(c, 'Na ranqueada os times são do sorteio.');
    if (r.state === 'playing') return this.erro(c, 'A partida está rolando. Espere acabar para mexer nos times.');
    if (r.tournament) return this.erro(c, 'Na copa os lugares são do chaveamento.');
    let alvo = eu;
    if (m.id && m.id !== c.id){
      if (r.host !== c.id) return this.erro(c, 'Só o árbitro da sala mexe nos outros.');
      alvo = r.members.find(x => x.id === m.id); if (!alvo) return;
    }
    let slot = alvo.slot;
    if (Number.isInteger(m.slot)) slot = m.slot < 0 ? -1 : m.slot < r.roster.length && !r.roster[m.slot] ? m.slot : alvo.slot;
    else if (Number.isInteger(m.team) && m.team >= 0 && m.team < (r.E || 2)){   // v92 · OFICINA: até 4 times
      if (alvo.slot >= 0 && Math.floor(alvo.slot/r.n) === m.team) return;
      slot = this.livre(r, m.team);
      if (slot < 0) return this.erro(c, (r.rachao ? 'O ' + RCH.TIMES[m.team] : r.custom && r.mapaDados ? r.mapaDados.partida.times[m.team].nome : NOMES_TIME[m.team]) + ' está cheio.');
    } else return;
    if (slot === alvo.slot) return;
    this.senta(r, alvo, slot); this.salaMuda(r);
  }
  config(c, m){
    const r = this.salaDe(c); if (!r || r.host !== c.id || r.state === 'playing' || r.ranked) return;
    if (r.rachao) return this.configRachao(c, r, m);    // v98: a sala do Rachão (o campo e as opções dela; não vira sala com mapa)
    if (r.custom || m.mapa || m.mapaDados) return this.configMapa(c, r, m);   // v92 · OFICINA: a sala com mapa personalizado
    if (!r.tournament && [1, 2, 3, 4].includes(m.n) && m.n !== r.n) this.novoN(r, m.n);
    if (MAPAS_SALA.includes(m.map)) r.map = m.map;        // v70.2: só a Arena e o Estádio
    if (MODOS_SALA.includes(m.jogo)) r.jogo = m.jogo;       // v70.2: só futebol e com curva
    if ('chutes' in m){                                  // v99: os chutes do Rachão — todo mundo na sala precisa do jogo novo
      const o = NUCLEO.crOpcoes(m.chutes), velho = o && r.members.find(x => !x.bot && !(this.porId.get(x.id) || {}).cr99);
      if (velho) this.erro(c, velho.name + ' está com o jogo antigo, sem os chutes do Rachão: peça para recarregar a página.', 'chutes_velho');
      else this.poeChutes(r, m.chutes);
    }
    if (r.jogo !== 'futebol') r.chutes = null;           // v99: (os chutes do Rachão são do FUTEBOL; o COM CURVA tem a curva dele)
    if (TEMPOS.includes(m.tempo)) r.tempo = m.tempo;
    // (v103: os bots não voltam pela configuração: as salas personalizadas não têm bots)
    if (typeof m.pub === 'boolean') r.pub = m.pub;
    if (typeof m.name === 'string' && limpa(m.name, 24)) r.name = limpa(m.name, 24);
    if (this.experimental){                              // v92: a versão de testes — o painel do admin manda o perfil da física
      if (m.fisica === null || m.fisica === 'padrao') r.fisica = null;
      else if (m.fisica === 'v91') r.fisica = NUCLEO.PERFIL_V91;
      else if (m.fisica && typeof m.fisica === 'object') r.fisica = NUCLEO.perfilLimpo(m.fisica, this.fisicaPadrao);
      if (m.quadros === 30 || m.quadros === 60) r.quadros = m.quadros;
      if (m.motor === 'v94' || m.motor === 'v93') r.motor = m.motor; else if (m.motor === null || m.motor === 'padrao') r.motor = null;   // v94
      if (m.fisica94 === null || m.fisica94 === 'padrao') r.fisica94 = null;
      else if (M94 && m.fisica94 && typeof m.fisica94 === 'object') r.fisica94 = M94.perfil(m.fisica94);
    }
    this.salaMuda(r);
  }
  poeChutes(r, o){                                       // v99: {lob, curva, super} conferido (só no futebol; null = só o chutar)
    r.chutes = r.jogo === 'futebol' && !r.custom && !r.rachao && !r.ranked ? NUCLEO.crOpcoes(o) : null;
  }
  ready(c, m){ const r = this.salaDe(c), eu = r && r.members.find(x => x.id === c.id); if (!eu) return; eu.ready = !!m.on; this.salaMuda(r); }
  rematch(c, m){
    const r = this.salaDe(c), eu = r && r.members.find(x => x.id === c.id); if (!eu) return;
    if (r.ranked) return this.erro(c, 'Na ranqueada não tem revanche: toque em JOGAR DE NOVO para procurar outra partida.');
    if (r.host === c.id){ if (r.state !== 'playing' && !r.tournament) this.start(c); return; }   // o dono pedindo revanche: começa de novo
    eu.rematch = m.on !== false; this.salaMuda(r);
  }
  motivo(r){                                             // o mesmo que o jogo confere antes de começar (slMotivo)
    if (r.custom) return r.roster.some(Boolean) ? '' : 'Ninguém está nos times. Toque num time para entrar.';   // v92 · OFICINA: vaga sem gente vira bot (ou fica vazia, sem bots)
    if (r.rachao){                                       // v98: a vaga sem gente vira bot; sem bots, cada time precisa de alguém
      if (!r.roster.some(Boolean)) return 'Ninguém está nos times. Toque num time para entrar.';
      if (!r.bots && (!r.roster.slice(0, r.n).some(Boolean) || !r.roster.slice(r.n).some(Boolean))) return 'Cada time precisa de pelo menos uma pessoa. Chame a galera em CONVIDAR.';   // (v103: a sala sem bots)
      return '';
    }
    if (r.tournament) return r.roster[0] && r.roster[1] ? '' : 'Os dois do duelo precisam estar na sala (toque em PRÓXIMO DUELO).';
    const gente = r.roster.filter(Boolean).length;
    if (!gente) return 'Ninguém está nos times. Toque no Time A ou no Time B para entrar.';
    // v103: sem bots, as vagas que sobram ficam vazias (o time joga com um a menos): só precisa de alguém em cada time
    if (!r.bots && (!r.roster.slice(0, r.n).some(Boolean) || !r.roster.slice(r.n).some(Boolean))) return 'Cada time precisa de pelo menos uma pessoa. Chame a galera em CONVIDAR.';
    return '';
  }
  start(c){
    const r = this.salaDe(c); if (!r || r.host !== c.id || r.state === 'playing' || r.ranked) return;
    if (r.tournament && r.tournament.champion) return this.erro(c, 'A copa acabou: toque em ENCERRAR COPA.');
    const motivo = this.motivo(r); if (motivo) return this.erro(c, motivo);
    Object.assign(r, {state:'playing', inicio:this.agora(), pausa:null, pausadoMs:0, ultimo:null, gols:{}, assist:{}, linha:[]});   // v88: + as assistências (o melhor da partida)
    r.round++; r.reservas.clear();
    for (const x of r.members){ x.ready = false; x.rematch = false; }
    if (r.servidor) this.ligaPartida(r);             // v83: a partida nasce no servidor, não no aparelho de ninguém
    this.todos(r, {type:'start', room:this.publica(r)});
    if (r.servidor) this.contagem(r);                  // v93: 3, 2, 1, JÁ! (todos começam juntos)
    this.salaMuda(r);
  }
  ligaPartida(r){                                      // v83: o motor autoritativo da sala (todos os lugares, com bots nas vagas)
    if (r.partida) return;
    r.estat = null;                                    // v93: os números da rodada nova (o craque não usa os da rodada de antes)
    r.v93Times = new Map(); r.v93Trocou = new Set();   // v93: o time de cada um nesta rodada (o admin que troca alguém de time: ver encerra)
    r.roster.forEach((id, i) => { if (id) r.v93Times.set(id, Math.floor(i/r.n)); });
    // v100 (segurança): os times com uma CONTA de gente, ligada, na saída. O selo diz o:1 só com contas em pelo menos dois
    // times: a patente da ranqueada online e o ranking da temporada só contam partida contra gente (um grupo contra os bots
    // que a fila pôs do outro lado, ou alguém sozinho contra os bots da sala, não). Quem cai no meio não tira o o:1 de ninguém.
    r.v100Times = new Set();
    r.roster.forEach((id, i) => {
      if (!id) return;
      const m = r.members.find(y => y.id === id), cl = this.porId.get(id);
      if (m && !m.bot && cl && cl.conta && cl.sala === r.code) r.v100Times.add(Math.floor(i/r.n));
    });
    if (r.rachao) return this.ligaPartidaRachao(r);    // v98: a partida do Rachão (o motor do Rachão)
    if (r.custom) return this.ligaPartidaMapa(r);      // v92 · OFICINA: a partida no mapa personalizado
    r.pid = novoId('p', 9);                            // v90: o número desta partida (a plataforma conta os gols e as assistências dela uma vez só)
    const jogadores = [];
    for (let i = 0; i < 2*r.n; i++){
      const id = r.roster[i], x = id && r.members.find(m => m.id === id);
      if (x) jogadores.push({netId:x.id, nome:x.name});
      else if (r.bots) jogadores.push({netId:null, nome:'Bot', bot:'dificil'});   // (a ranqueada: os bots completam)
      else jogadores.push({vazio:true});               // v103: a sala personalizada sem bots: a vaga fica vazia (o time joga com um a menos)
    }
    const semBots = !r.bots;
    // v94: o motor da rodada. A sala com o motor próprio só roda com ele se todos os aparelhos em campo o conhecem (a página
    // antiga guardada num aparelho não entende o m94): senão a rodada vai no motor de antes, para todos, e a sala avisa
    let motor = this.motorDe(r);
    if (this.temChutes(r)) motor = 'v93';              // v99: os chutes do Rachão moram no núcleo (o motor próprio da v94 não tem)
    if (jogadores.some(j => j.vazio)) motor = 'v93';     // v103: a vaga vazia é do motor das salas (o motor próprio da v94 não tem)
    if (motor === 'v94'){
      const velhos = jogadores.filter(j => j.netId && !(this.porId.get(j.netId) || {}).v94);
      if (velhos.length){ motor = 'v93'; this.diz(r, {type:'say', sys:true, who:'', text:'Esta rodada vai com o motor de antes: ' + velhos.map(j => j.nome).join(', ') + ' está com uma versão antiga do jogo.', t:Date.now()}); }
    }
    const p = new PartidaSala({
      n:r.n, jogo:r.jogo, map:r.map, tempo:r.tempo, regra:r.regra, ranked:r.ranked, r80:this.r80, jogadores,
      fisica:this.fisicaDe(r), fisicaBase:this.fisicaPadrao, quadros:this.quadrosDe(r),             // v92: o perfil da sala · v105: 60 quadros por segundo
      motor, fisica94:r.fisica94 || null,                                                           // v94: o motor e o perfil dele
      chutes:this.temChutes(r) ? r.chutes : null,                                                   // v99: os chutes do Rachão
      semBots:semBots && motor !== 'v94',                                                           // v103: quem sai deixa a vaga vazia (sem bot no lugar; o motor próprio da v94, de testes, ainda põe o bot)
      agora:() => this.agora(), decorrido:() => this.decorrido(r),
      log:t => this.log(t),
      suspeito:(id, tipo, det) => this.log('suspeito na sala ' + r.code + ': ' + id + ' ' + tipo + (det ? ' (' + det + ')' : '')),   // registro para investigação, sem banimento automático
      onSnapshot:data => {
        r.ultimo = {score:data.score.slice(), elapsed:data.elapsed, tick:data.tick, state:data.state};
        this.todos(r, {type:'snapshot', round:r.round, data});
      },
      onGol:g => {
        if (g.author) r.gols[g.author] = (r.gols[g.author] | 0) + 1;
        if (g.assist){ r.assist = r.assist || {}; r.assist[g.assist] = (r.assist[g.assist] | 0) + 1; }   // v88: a assistência (o melhor da partida)
        if (r.regra === 'v80') (r.linha || (r.linha = [])).push({s:g.placar.slice(), el:Math.max(0, g.el), ms:this.decorrido(r)});   // a linha do tempo (auditoria)
        if (r.pub && !r.ranked) this.listaMudou();     // v88: o placar na lista das salas (quem quer assistir)
        this.painelLogo(r);                            // v93: os números do painel na hora do gol
      },
      onAviso:txt => this.diz(r, {type:'say', sys:true, who:'', text:txt, t:Date.now()}),
      onFim:res => this.encerraServidor(r, res),
      onReplay:() => this.replayComeca(r),             // v93: o replay do gol para todos (o servidor segura e solta)
    });
    r.partida = p;
    p.ligar();
    this.log('sala ' + r.code + ': partida hospedada começou (' + r.n + 'v' + r.n + ', ' + r.jogo + (r.regra === 'v80' ? ', v80' : r.tempo ? ', ' + r.tempo + ' min' : ', até ' + 3) + ', motor ' + p.motor + ')');
  }
  encerraServidor(r, res){                             // v83: o motor terminou a partida (ele é a autoridade do placar)
    r.estat = Array.isArray(res.estat) ? res.estat : null;   // v93: os números de cada um (o craque)
    this.v93Limpa(r);
    if (r.partida){ r.partida.desligar(); r.partida = null; }
    if (r.state !== 'playing') return;
    if (r.rachao) return this.encerraRachao(r, res);   // v98: a sala do Rachão (sem selo nem troféu, como as salas com mapa)
    if (r.custom) return this.encerraMapa(r, res);     // v92 · OFICINA: sem selo nem troféu (a física e o mapa são do criador)
    this.encerra(r, res.placar.slice(), true);
  }
  abortaPartida(r){                                    // v83: a sala esvaziou (ou fechou) no meio da partida: para o motor sem resultado
    this.v93Limpa(r);
    if (r.partida){ r.partida.aborta(); r.partida.desligar(); r.partida = null; }
  }
  snapshot(c, m){                                        // o quadro do anfitrião: repassa (menos para quem recebe direto) e anota o placar
    const r = this.salaDe(c); if (!r || r.state !== 'playing') return;
    if (r.servidor){                                     // v83: sala hospedada não aceita quadro de aparelho nenhum (registro p/ investigação)
      this.log('suspeito na sala ' + r.code + ': ' + c.id + ' mandou snapshot com a partida no servidor');
      return;
    }
    if (r.host !== c.id || m.round !== r.round) return;
    if (!this.balde(c, 'quadro', 75, 120)) return;
    const d = m.data; if (!d || typeof d !== 'object' || !Array.isArray(d.score)) return;
    const s = [inteiro(d.score[0], 0, 999, 0), inteiro(d.score[1], 0, 999, 0)], u = r.ultimo;
    if (u && (s[0] !== u.score[0] || s[1] !== u.score[1]) && d.goal && typeof d.goal.author === 'string' && r.roster.includes(d.goal.author)) r.gols[d.goal.author] = (r.gols[d.goal.author] | 0) + 1;
    if (r.regra === 'v80' && (u ? s[0] !== u.score[0] || s[1] !== u.score[1] : s[0] || s[1])){   // v80: o gol na linha do tempo (a hora do anfitrião e a do servidor)
      const el = d.goal && typeof d.goal.el === 'number' && isFinite(d.goal.el) ? d.goal.el : Number(d.elapsed) || 0;
      (r.linha || (r.linha = [])).push({s:s.slice(), el:Math.max(0, el), ms:this.decorrido(r)});
    }
    r.ultimo = {score:s, elapsed:Math.max(0, Number(d.elapsed) || 0), tick:Math.max(0, d.tick | 0), state:String(d.state || '').slice(0, 8)};
    const txt = JSON.stringify({type:'snapshot', round:r.round, data:d});
    for (const x of r.members){
      if (x.bot || x.id === c.id) continue;
      const cl = this.porId.get(x.id); if (cl && cl.sala === r.code && !cl.p2p) this.mandaTxt(cl, txt);
    }
  }
  input(c, m){                                           // o comando de quem joga: na sala hospedada vai para o motor; senão, para o anfitrião
    const r = this.salaDe(c); if (!r || r.state !== 'playing' || r.roster.indexOf(c.id) < 0) return;
    if (!this.balde(c, 'comando', 130, 200)) return;
    if (r.servidor){                                     // v83: todos mandam para o servidor — inclusive quem criou a sala
      if (!r.partida) return;
      if (r.rachao) return r.partida.entrada(c.id, m);   // v98: o comando do Rachão (conferido no quadro.js: a direção, os botões e os contadores)
      const cmd = {seq:inteiro(m.seq, 0, 2e9, 0), x:+m.x || 0, y:+m.y || 0, button:[1, 2, 3].includes(m.button) ? m.button : 1, k:inteiro(m.k, 0, 7, 0),
        kc:inteiro(m.kc, 0, 2e9, undefined), pc:inteiro(m.pc, 0, 2e9, undefined)};   // v92: os contadores de toque (o toque não se perde)
      if (r.partida.cr){                                 // v99: os toques dos chutes do Rachão, o super segurado e o cancelado, o último lado da curva
        cmd.lb = inteiro(m.lb, 0, 2e9, undefined); cmd.ce = inteiro(m.ce, 0, 2e9, undefined); cmd.cd = inteiro(m.cd, 0, 2e9, undefined); cmd.sx = inteiro(m.sx, 0, 2e9, undefined);
        cmd.su = m.su === 1 ? 1 : 0; cmd.cu = m.cu === -1 || m.cu === 1 ? m.cu : 0;
      }
      r.partida.entrada(c.id, cmd);
      return;
    }
    if (r.host === c.id) return;
    const h = this.porId.get(r.host); if (!h || h.sala !== r.code) return;
    const num = v => Math.max(-1, Math.min(1, Number(v) || 0));
    this.manda(h, {type:'input', id:c.id, seq:inteiro(m.seq, 0, 2e9, 0), x:num(m.x), y:num(m.y), button:[1, 2, 3].includes(m.button) ? m.button : 1, k:inteiro(m.k, 0, 7, 0)});
  }
  pause(c, m){
    const r = this.salaDe(c); if (!r || r.host !== c.id || r.state !== 'playing') return;
    if (r.ranked) return;                                // v83: a ranqueada não tem árbitro nem pausa (ninguém segura a partida dos outros)
    if (r.rachao) return;                                // v98: a partida do Rachão não pausa (a tela dele não tem a pausa da sala: travaria todo mundo)
    const on = !!m.paused;
    if (on && !r.pausa) r.pausa = this.agora();
    else if (!on && r.pausa){ this.v93Some(r, r.pausa, r.replay ? r.replay.t0 : null); r.pausa = null; }
    if (r.partida) r.partida.pausado = on || !!r.contagem || !!r.replay;   // v83: o relógio e a física do servidor param juntos · v93: a contagem e o replay continuam
    this.todos(r, {type:'pause', paused:on}, c);
    if (r.regra === 'v80') this.todos(r, Object.assign({type:'relogio', round:r.round}, this.relogioDe(r)));   // v80: o relógio para (e volta) na hora
  }
  confere(r, score, peloServidor){                       // o resultado é possível? '' = vale · senão, o motivo (peloServidor: o fim que o servidor deu, v80)
    const md = r.jogo, meta = META[md] || 3, maxp = MAX_PTS[md] || 1;
    const dur = (this.agora() - r.inicio - r.pausadoMs)/1000, [a, b] = score, w = Math.max(a, b), l = Math.min(a, b), u = r.ultimo;
    if (r.encerrada === r.round) return 'encerrada pelo árbitro';
    if (!u) return 'o servidor não recebeu os quadros da partida';
    if (!peloServidor && (u.score[0] !== a || u.score[1] !== b)) return 'placar diferente do que a partida mostrou';
    if (dur < 10) return 'partida curta demais';
    if (u.elapsed > dur + 5) return 'tempo de jogo maior que o tempo de verdade';
    if (r.regra === 'v80'){                              // v80: a linha do tempo dos gols no relógio do servidor decide como acaba
      if (w > this.r80.meta + maxp - 1 || l >= this.r80.meta) return 'placar impossível para o modo';
      const f = this.fim80(r);
      if (f.erro) return f.erro;
      if (f.s[0] !== a || f.s[1] !== b) return 'placar diferente do que o relógio do servidor permite';
      if (dur + TOL80.fim < f.at) return 'acabou antes do tempo';
    } else if (r.tempo){
      if (a === b) return 'terminou empatada';
      if (u.elapsed + 3 < r.tempo*60) return 'acabou antes do tempo';
    } else if (w < meta || w > meta + maxp - 1 || l >= meta) return 'placar impossível para o modo';
    if (w > (Math.floor(dur/4) + 2)*maxp) return 'placar rápido demais para o tempo';
    return '';
  }
  finish(c, m){
    const r = this.salaDe(c); if (!r || r.state !== 'playing') return;
    if (r.servidor){                                     // v83: quem encerra a partida hospedada é o motor, nunca um aparelho
      this.log('suspeito na sala ' + r.code + ': ' + c.id + ' mandou finish com a partida no servidor');
      return;
    }
    if (r.host !== c.id || m.round !== r.round || !Array.isArray(m.score)) return;
    const score = [inteiro(m.score[0], 0, 999, -1), inteiro(m.score[1], 0, 999, -1)]; if (score[0] < 0 || score[1] < 0) return;
    this.encerra(r, score, false);
  }
  encerra(r, score, peloServidor){                       // o fim da rodada: confere, guarda o que vale e manda o resultado (v80: também o fim que o servidor deu)
    if (r.pausa){ this.v93Some(r, r.pausa, r.replay ? r.replay.t0 : null); r.pausa = null; }
    const motivo = this.confere(r, score, peloServidor), valida = !motivo, winner = score[0] > score[1] ? 0 : score[1] > score[0] ? 1 : -1;
    const dur = Math.round((this.agora() - r.inicio - r.pausadoMs)/1000);
    r.state = 'ended';
    if (valida) this.registra(r, winner);
    if (r.tournament) this.copaResultado(r, score, winner);
    this.log('sala ' + r.code + ' rodada ' + r.round + ': ' + score.join('×') + (peloServidor ? ' (o servidor encerrou no tempo)' : '') + (valida ? ' (valeu)' : ' (não valeu: ' + motivo + ')'));
    const craque = r.servidor ? this.craqueDe(r, winner) : null;   // v93: o craque da partida (gols, assistências, defesas, desarmes, chutes, passes e o resultado)
    let mvp88 = valida && this.segredo ? (r.servidor && r.estat ? (craque && !craque.bot ? craque.k : null) : this.v88Mvp(r, winner)) : null;
    if (mvp88 && r.v93Trocou && r.v93Trocou.has(mvp88)) mvp88 = null;   // v93: (o melhor da partida na conta não é quem trocou de time no meio)
    const g88 = valida && this.segredo ? this.v88Jogadores(r) : null;   // v88: quem jogou junto e o melhor da partida (v93: o craque do motor; sem os números do motor, a regra da v88)
    for (const x of r.members){
      if (x.bot) continue;
      const cl = this.porId.get(x.id); if (!cl || cl.sala !== r.code) continue;
      const trocou = !!(r.v93Trocou && r.v93Trocou.has(x.id));   // v93: o admin trocou de time no meio da partida: o resultado não vale para ele
      const msg = {type:'result', round:r.round, score, winner, valida:valida && !trocou};
      if (motivo) msg.motivo = motivo; else if (trocou) msg.motivo = 'você trocou de time no meio da partida';
      if (peloServidor) msg.servidor = true;              // v80: o anfitrião não mandou o fim; o servidor encerrou pelo relógio dele
      if (r.ranked) msg.ranked = true;                    // v79: os pontos da ranqueada (cada jogo aplica os seus, com o resultado conferido)
      const i = r.roster.indexOf(x.id);
      if (valida && !trocou && this.segredo && cl.conta && i >= 0){   // o selo: a plataforma confere antes de dar XP da partida online
        const t = Math.floor(i/r.n), agora = Date.now();
        const sl = {s:r.code, r:r.round, j:cl.conta.idPublico, l:t, p:[score[t], score[1 - t]], m:r.jogo, d:dur, k:r.ranked ? 1 : 0, n:r.n, g:g88, v:mvp88 === x.id ? 1 : 0, t:agora, e:agora + 40*60e3};   // v82: k = ranqueada, n = o tamanho do time (a conta só conta a patente com o selo da ranqueada) · v88: g = as contas que jogaram, v = o melhor da partida
        if (r.servidor && r.pid){                         // v90: o ranking — só a partida que o SERVIDOR simulou: os gols (sem os contra) e as assistências DESTE jogador, contados pelo motor
          sl.h = 1; sl.pid = r.pid; sl.gl = (r.gols && r.gols[x.id]) | 0; sl.as = (r.assist && r.assist[x.id]) | 0;
          if (r.v100Times && r.v100Times.size >= 2) sl.o = 1;   // v100: contra gente (a patente online e o ranking da temporada só contam assim)
        }
        msg.selo = assina(this.segredo, sl);
      }
      if (mvp88){ msg.melhor = {id:mvp88, nome:this.nomeNaSala(r, mvp88)}; if (mvp88 === x.id) msg.mvp = true; }   // v88: o melhor da partida (o jogo mostra; a conta confere pelo selo)
      if (craque){ msg.craque = craque; if (!craque.bot && craque.k === x.id) msg.mvp = true; }   // v93: o cartão do craque (para todos)
      if (r.estat) msg.estat = r.estat.map(e => ({k:e.bot ? null : e.k, nome:e.nome, bot:e.bot, time:e.time, g:e.g, a:e.a, d:e.d, r:e.r, c:e.c, p:e.p, cg:e.cg}));
      this.manda(cl, msg);
    }
    this.salaMuda(r);
  }
  /* ------------------------------------------------------------------ v93 · Fase 2: a contagem, o replay do gol, o painel e o craque */
  contagem(r){                                         // 3, 2, 1, JÁ!: o motor espera (ninguém sai antes) e o relógio começa depois
    if (!r.partida || CONTAGEM_MS <= 0) return;      // (RACHA_CONTAGEM_MS=0: começa na hora, como antes)
    if (!r.members.some(x => !x.bot && (this.porId.get(x.id) || {}).v93)) return;   // (só aparelhos com a página antiga: começa na hora, como eles esperam)
    const ms = CONTAGEM_MS; clearTimeout(r.contagemT);
    r.contagem = {ate:this.agora() + ms}; r.inicio = this.agora() + ms; r.partida.pausado = true;
    try { r.partida.onSnapshot(r.partida.quadro()); } catch (_) {}   // (a formação de saída na tela de todos)
    this.todos(r, {type:'contagem', round:r.round, ms});
    r.contagemT = setTimeout(() => this.contagemFim(r), ms); if (r.contagemT.unref) r.contagemT.unref();
  }
  contagemFim(r){
    r.contagemT = null; if (!r.contagem) return;
    r.contagem = null;
    if (r.partida && r.state === 'playing'){ r.partida.soltaFilas(); r.partida.pausado = !!r.pausa || !!r.replay; }
    if (r.regra === 'v80') this.todos(r, Object.assign({type:'relogio', round:r.round}, this.relogioDe(r)));
  }
  ativosDe(r){                                         // quem está jogando agora (gente de verdade, ligada, num lugar do time)
    return r.roster.filter(id => { if (!id) return false; const m = r.members.find(x => x.id === id), cl = this.porId.get(id); return m && !m.bot && cl && cl.sala === r.code; });
  }
  votantesDe(r){                                       // quem vota no PULAR do replay: quem está jogando com a v93 (a página antiga não tem o botão: não trava ninguém)
    return this.ativosDe(r).filter(id => (this.porId.get(id) || {}).v93);
  }
  replayComeca(r){                                     // (o motor chama depois da comemoração do gol) devolve se o replay vai passar
    if (!REPLAY_ON || !r.servidor || r.state !== 'playing' || r.replay) return false;
    const precisa = this.votantesDe(r).length; if (!precisa) return false;   // (só a página antiga jogando: a saída na hora, como antes)
    r.replay = {t0:this.agora(), round:r.round, votos:new Set(), precisa};
    this.todos(r, {type:'replay', round:r.round, ms:REPLAY_MS, votos:0, precisa});
    if (r.regra === 'v80') this.todos(r, Object.assign({type:'relogio', round:r.round}, this.relogioDe(r)));
    clearTimeout(r.replayT); r.replayT = setTimeout(() => this.replayFim(r, 'tempo'), REPLAY_MS); if (r.replayT.unref) r.replayT.unref();
    return true;
  }
  replayPula(c, m){                                    // o voto de quem está jogando (PULAR): pula quando todos votam
    const r = this.salaDe(c); if (!r || !r.replay || (m && m.round != null && m.round !== r.replay.round)) return;
    if (this.votantesDe(r).indexOf(c.id) < 0) return;  // (quem assiste não vota)
    if (!this.balde(c, 'replay', 2, 4)) return;
    r.replay.votos.add(c.id);
    this.replayConfere(r);
  }
  replayConfere(r){                                    // quem caiu sai da conta: a votação nunca trava
    const R = r.replay; if (!R) return;
    const ativos = this.votantesDe(r);
    for (const id of [...R.votos]) if (ativos.indexOf(id) < 0) R.votos.delete(id);
    R.precisa = ativos.length;
    if (!R.precisa || R.votos.size >= R.precisa) return this.replayFim(r, 'votos');
    this.todos(r, {type:'replay_votos', round:R.round, votos:R.votos.size, precisa:R.precisa});
  }
  replayFim(r, porque){                                // o servidor encerra o replay para todos ao mesmo tempo
    const R = r.replay; if (!R) return;
    clearTimeout(r.replayT); r.replayT = null;
    this.v93Some(r, R.t0, r.pausa || null); r.replay = null;
    if (r.partida){ r.partida.fimReplay(); r.partida.pausado = !!r.pausa; }   // (a saída do gol; com a sala pausada, o motor continua parado)
    this.todos(r, {type:'replay_fim', round:R.round, porque:porque || ''});
    if (r.regra === 'v80') this.todos(r, Object.assign({type:'relogio', round:r.round}, this.relogioDe(r)));
  }
  v93Limpa(r){                                         // a partida acabou (ou parou): a contagem e o replay não ficam pendurados
    clearTimeout(r.contagemT); r.contagemT = null; r.contagem = null;
    if (r.replay){
      const R = r.replay; clearTimeout(r.replayT); r.replayT = null; this.v93Some(r, R.t0, r.pausa || null); r.replay = null;
      this.todos(r, {type:'replay_fim', round:R.round, porque:'fim'});
    }
  }
  v93Some(r, x0, y0){                                   // o tempo parado que sai do relógio (a pausa ou o replay que acabou); y0: o começo do outro, se ainda está rodando
    const agora = this.agora(), i0 = r.inicio || 0; x0 = Math.max(x0, i0); if (y0 != null) y0 = Math.max(y0, i0);   // (a contagem não é tempo de jogo: conta a partir do começo)
    r.pausadoMs += y0 != null ? Math.max(0, Math.min(agora, y0) - x0) : Math.max(0, agora - x0);   // (o pedaço junto com o outro, o outro conta)
  }
  v93Time(r, id, slot){                                // o admin pôs alguém num lugar no meio da partida: trocou de time nesta rodada?
    if (!r.v93Times || slot < 0) return;
    const t = Math.floor(slot/r.n), t0 = r.v93Times.get(id);
    if (t0 == null) r.v93Times.set(id, t); else if (t0 !== t) r.v93Trocou.add(id);
  }
  painelDe(r){                                         // o painel de jogadores: cada lugar (ativo, caiu, bot), o ping, os números; o banco e quem assiste
    const p = r.partida, est = (p && p.est) || {}, agora = Date.now(), res = [...r.reservas];
    const j = r.roster.map((id, i) => {
      const m = id && r.members.find(x => x.id === id), cl = m && this.porId.get(m.id), rv = !id ? res.find(([, v]) => v.slot === i) : null;
      const e = est[id || (rv && rv[0]) || ('b' + i)] || null;
      return {i, id:id || null, nome:m ? m.name : rv ? rv[1].nome || 'Jogador' : r.bots ? 'Bot' : '', st:m ? 'ativo' : rv ? 'caiu' : r.bots ? 'bot' : 'vazio', ms:cl && Number.isFinite(cl.ms) ? cl.ms : null,
        ate:rv ? Math.max(0, Math.round((rv[1].ate - agora)/1000)) : 0, e:e ? {g:e.g, a:e.a, d:e.d, r:e.r} : null};
    });
    const fora = r.members.filter(x => x.slot < 0 && !x.bot).map(x => ({id:x.id, nome:x.name, skin:x.skin, banco:!!x.banco}));
    return {type:'painel', round:r.round, j, fora};
  }
  painels(){ for (const r of this.salas.values()) if (r.servidor && r.state === 'playing') this.todos(r, this.painelDe(r)); }
  painelLogo(r){                                       // (um gol, alguém caiu ou voltou: o painel na hora, no máximo 4 vezes por segundo)
    if (!r || !r.servidor || r.state !== 'playing' || r.painelT) return;
    r.painelT = setTimeout(() => { r.painelT = null; if (r.state === 'playing') this.todos(r, this.painelDe(r)); }, 250); if (r.painelT.unref) r.painelT.unref();
  }
  banco(c, m){                                         // quem assiste entra no banco (reserva: quer jogar) ou volta a só assistir
    const r = this.salaDe(c); if (!r || r.ranked) return;
    const eu = r.members.find(x => x.id === c.id); if (!eu || eu.slot >= 0) return;
    if (!this.balde(c, 'banco', 1, 4)) return;
    eu.banco = !!m.on; this.salaMuda(r); this.painelLogo(r);
  }
  craqueDe(r, winner){                                 // o craque da partida: a conta equilibrada (ver tools/v93/partida.js) — calculada aqui, no servidor
    const L = r.estat; if (!Array.isArray(L) || !L.length) return null;
    let m = null;
    for (const e of L){
      const pts = Math.round((10*e.g + 6*e.a + 4*e.d + 2*e.r + 1.5*e.c + .5*e.p - 5*e.cg + (winner < 0 ? 1 : e.time === winner ? 3 : 0))*10)/10;
      if (pts < 1) continue;
      const x = {k:e.bot ? null : e.k, id:e.bot ? null : e.k, nome:e.nome, bot:!!e.bot, time:e.time, pts, g:e.g, a:e.a, d:e.d, r:e.r, c:e.c, p:e.p, cg:e.cg};
      if (!m || x.pts > m.pts || (x.pts === m.pts && (x.g > m.g || (x.g === m.g && (x.a > m.a || (x.a === m.a && x.d > m.d)))))) m = x;
    }
    if (m && !m.bot){ const mem = r.members.find(x => x.id === m.k); if (mem) m.skin = mem.skin; }
    return m;
  }
  /* ------------------------------------------------------------------ v93 · Fase 3: o painel do admin da sala
     adm {acao:'mover', id, time|slot} · {acao:'reserva', id} · {acao:'admin', id} · {acao:'expulsar', id} · {acao:'encerrar'} · {acao:'reiniciar'}
     Só o admin, só nas salas personalizadas (nunca na ranqueada nem na copa); tudo conferido aqui; cada ação vai para o log
     e para o chat da sala; a sala nova vai para todos. Na partida (hospedada) o motor troca quem joga em cada lugar sem parar. */
  adm(c, m){
    const r = this.salaDe(c); if (!r) return;
    if (r.ranked || r.tournament) return this.erro(c, 'Na ranqueada (e na copa) não tem admin: as regras são fixas.', 'adm');
    if (r.host !== c.id) return this.erro(c, 'Só o admin da sala faz isso.', 'adm');
    if (!this.balde(c, 'adm', 3, 8)) return this.erro(c, 'Calma: uma ação de cada vez.', 'adm');
    const acao = String(m && m.acao || ''), alvo = m && typeof m.id === 'string' ? r.members.find(x => x.id === m.id && !x.bot) : null;
    const jogando = r.state === 'playing', motor = jogando && r.servidor ? r.partida : null;
    if (jogando && !r.servidor && acao !== 'admin') return this.erro(c, 'Nesta sala a partida não é do servidor: espere acabar.', 'adm');
    const feito = txt => { this.log('admin da sala ' + r.code + ' (' + (c.nome || c.id) + '): ' + txt); this.diz(r, {type:'say', sys:true, who:'', text:txt, t:Date.now()}); this.salaMuda(r); this.painelLogo(r); };
    const nT = r.E || 2, nomeDe = t => r.rachao ? RCH.TIMES[t] : r.custom && r.mapaDados ? r.mapaDados.partida.times[t].nome : (t ? 'Time B' : 'Time A'), nomeT = s => nomeDe(Math.floor(s/r.n));   // v92 · OFICINA: até 4 times, com os nomes do mapa · v98: Vermelho × Azul no Rachão
    if ((acao === 'mover' || acao === 'reserva') && motor && (motor.fimPendente || motor.estado === 'fim' || motor.encerrado))
      return this.erro(c, 'A partida está acabando: espere o fim para mexer nos times.', 'adm');
    if (acao === 'mover'){
      if (!alvo) return this.erro(c, 'Essa pessoa não está mais na sala.', 'adm');
      let slot = Number.isInteger(m.slot) ? m.slot : -1;
      if (slot < 0){
        const t = Number.isInteger(m.time) && m.time > 0 && m.time < nT ? m.time : 0, guardadas = new Set([...r.reservas.values()].map(v => v.slot));
        slot = -1; for (let k = 0; k < r.n; k++){ const i = t*r.n + k; if (!r.roster[i] && !guardadas.has(i)){ slot = i; break; } }
        if (slot < 0) slot = this.livre(r, t);           // (só sobrou a vaga de quem caiu: ela mesma)
        if (slot < 0) return this.erro(c, 'O ' + nomeDe(t) + ' está cheio: escolha com quem trocar.', 'adm');
      }
      if (slot < 0 || slot >= r.roster.length) return;
      const de = alvo.slot, ocupaId = r.roster[slot], ocupa = ocupaId && r.members.find(x => x.id === ocupaId);
      if (ocupa === alvo) return;
      if (motor && r.rachao && (!motor.temLugar(slot) || (ocupa && de >= 0 && !motor.temLugar(de))))   // v98: (sem bots, o lugar vazio não tem jogador nesta partida)
        return this.erro(c, 'Nesta partida do Rachão essa vaga está vazia: mude entre as partidas.', 'adm');
      for (const [id, v] of r.reservas) if (v.slot === slot) r.reservas.delete(id);   // (a vaga de quem caiu agora é de outro: ele volta assistindo)
      if (ocupa){ this.senta(r, ocupa, de); ocupa.banco = de < 0; }
      this.senta(r, alvo, slot); alvo.banco = false;
      if (motor){
        if (ocupa && de >= 0) motor.admTroca(de, slot);
        else motor.admPoe(alvo.id, alvo.name, slot);
        r.reservas.delete(alvo.id); if (ocupa) r.reservas.delete(ocupa.id);
        this.v93Time(r, alvo.id, slot); if (ocupa && de >= 0) this.v93Time(r, ocupa.id, de);
      }
      return feito(alvo.name + ' foi para o ' + nomeT(slot) + (ocupa ? (de >= 0 ? ' (trocou com ' + ocupa.name + ')' : ' no lugar de ' + ocupa.name + ', que foi para o banco') : ''));
    }
    if (acao === 'reserva'){
      if (!alvo || alvo.slot < 0) return;
      const de = alvo.slot; this.senta(r, alvo, -1); alvo.banco = true;
      if (motor) motor.admTira(alvo.id);
      return feito(alvo.name + ' foi para o banco' + (motor ? (!r.bots ? ' (a vaga no ' + nomeT(de) + ' fica vazia)' : ' (o bot segura o lugar no ' + nomeT(de) + ')') : ''));
    }
    if (acao === 'admin' || acao === 'expulsar'){
      if (!alvo || alvo.id === c.id) return this.erro(c, 'Essa pessoa não está mais na sala.', 'adm');
      this.log('admin da sala ' + r.code + ' (' + (c.nome || c.id) + '): ' + (acao === 'admin' ? 'passou o admin para ' : 'removeu ') + alvo.name);
      return acao === 'admin' ? this.promote(c, {id:alvo.id}) : this.kick(c, {id:alvo.id});
    }
    if (acao === 'encerrar'){
      if (!jogando) return this.erro(c, 'Não tem partida rolando.', 'adm');
      r.encerrada = r.round;                           // (o resultado não vale prêmio: como o ENCERRAR do árbitro de sempre)
      this.log('admin da sala ' + r.code + ' (' + (c.nome || c.id) + '): encerrou a partida');
      this.diz(r, {type:'say', sys:true, who:'', text:'O admin encerrou a partida.', t:Date.now()});
      if (r.pausa){ this.v93Some(r, r.pausa, r.replay ? r.replay.t0 : null); r.pausa = null; this.todos(r, {type:'pause', paused:false}); }
      this.v93Limpa(r);
      if (motor) motor.encerraJa(); else this.encerra(r, r.ultimo ? r.ultimo.score.slice() : [0, 0], true);
      return;
    }
    if (acao === 'reiniciar'){
      if (!jogando || !r.servidor) return this.erro(c, 'Não tem partida rolando para reiniciar.', 'adm');
      const mot = this.motivo(r); if (mot) return this.erro(c, 'Não dá para reiniciar agora: ' + mot.charAt(0).toLowerCase() + mot.slice(1), 'adm');   // (a partida continua)
      this.log('admin da sala ' + r.code + ' (' + (c.nome || c.id) + '): reiniciou a partida');
      if (r.pausa){ this.v93Some(r, r.pausa, r.replay ? r.replay.t0 : null); r.pausa = null; this.todos(r, {type:'pause', paused:false}); }
      this.abortaPartida(r);
      r.state = 'waiting'; r.interrompida = r.round;
      this.diz(r, {type:'say', sys:true, who:'', text:'O admin reiniciou a partida: 0 × 0, os mesmos times.', t:Date.now()});
      this.start(c);
      return;
    }
  }
  /* ------------------------------------------------------------------ v93 · Fase 5: os balões de fala rápida
     fala {i}: uma das frases prontas (nada de texto livre: nada para o filtro), só de quem está jogando, no ritmo (uma a cada
     1,5 s, até 3 seguidas); vai para todos da sala, menos para quem bloqueou quem falou (ou foi bloqueado por ele). */
  fala(c, m){
    const r = this.salaDe(c); if (!r || r.state !== 'playing') return;
    const eu = r.members.find(x => x.id === c.id); if (!eu || eu.slot < 0) return;   // (quem assiste não fala no campo)
    if ((r.silencio && r.silencio.get(c.id) || 0) > Date.now()) return;   // (silenciado nesta sala por denúncias: os balões também esperam)
    { const calado109 = this.v109Calado(c); if (calado109) return this.erro(c, calado109, 'silenciado_staff'); }   // v109: o silêncio da equipe também cala as falas
    const i = m && Number.isInteger(m.i) ? m.i : -1; if (i < 0 || i >= FALAS93) return;
    const rf = r.v93Falas || (r.v93Falas = new Map()); let fr = rf.get(c.id); if (!fr) rf.set(c.id, fr = {baldes:{}});
    if (!this.balde(fr, 'fala93', .66, 3)) return;   // (o ritmo é da pessoa na sala, não da conexão: reconectar não zera)
    const txt = JSON.stringify({type:'fala', id:c.id, slot:eu.slot, i});
    for (const x of r.members){
      if (x.bot || x.id === c.id) continue;
      const cl = this.porId.get(x.id); if (!cl || cl.sala !== r.code) continue;
      if (typeof this.v88Bloqueado === 'function' && this.v88Bloqueado(c, cl)) continue;
      this.mandaTxt(cl, txt);
    }
  }
  registra(r, winner){                                   // o que vale fica guardado: partidas, vitórias (troféus), gols e os duelos 1v1
    const quem = [];
    r.roster.forEach((id, i) => { if (id && this.b.d.gente[id] && !(r.v93Trocou && r.v93Trocou.has(id))) quem.push({id, t:Math.floor(i/r.n)}); });   // v93: (sem quem trocou de time no meio)
    for (const x of quem){
      const g = this.b.d.gente[x.id]; g.st = g.st || {jogos:0, vit:0, der:0, emp:0, gols:0};
      g.st.jogos++; if (winner < 0) g.st.emp++; else if (winner === x.t) g.st.vit++; else g.st.der++;
      g.st.gols += r.gols[x.id] | 0;
    }
    if (r.n === 1 && quem.length === 2){
      const ids = quem.map(x => x.id).sort(), k = ids.join('|');
      const du = this.b.d.duelos[k] || (this.b.d.duelos[k] = {a:ids[0], b:ids[1], va:0, vb:0, jogos:0, ultimo:0});
      du.jogos++; du.ultimo = Date.now();
      if (winner >= 0){ const v = quem.find(x => x.t === winner).id; if (v === du.a) du.va++; else du.vb++; }
    }
    this.b.marca();
  }
  kick(c, m){
    const r = this.salaDe(c); if (!r || r.host !== c.id || !m.id || m.id === c.id || r.ranked) return;
    const alvo = r.members.find(x => x.id === m.id); if (!alvo) return;
    r.removidos.set(alvo.id, Date.now() + 30000);
    const cl = this.porId.get(alvo.id);
    if (cl && cl.sala === r.code){ this.sai(cl, 'kick'); this.manda(cl, {type:'left'}); this.erro(cl, 'Você foi removido da sala.'); }
    else { if (alvo.slot >= 0) r.roster[alvo.slot] = null; r.members = r.members.filter(x => x !== alvo); this.salaMuda(r); }
  }
  promote(c, m){
    const r = this.salaDe(c); if (!r || r.host !== c.id || !m.id || m.id === c.id || r.ranked) return;
    if (r.state === 'playing' && !r.servidor) return this.erro(c, 'Com a partida rolando, quem roda o jogo continua o mesmo. Passe o dono depois.');
    // v83: na sala hospedada o admin pode ser passado a qualquer momento (a simulação é do servidor, não dele)
    const alvo = r.members.find(x => x.id === m.id && !x.bot); if (!alvo) return;
    r.host = alvo.id;
    this.diz(r, {type:'say', sys:true, text:alvo.name + (r.servidor ? ' agora é o admin da sala' : ' agora é o dono da sala'), t:Date.now()});
    this.salaMuda(r);
  }
  say(c, m){
    const r = this.salaDe(c); if (!r) return;
    const t = String(m.text == null ? '' : m.text).slice(0, 120); if (!t.trim()) return;
    const arb = ARB_RE.test(t);
    if (arb){
      if (!this.balde(c, 'arb', 3, 12)) return;
      const o = /^⁣?ARB:e\|(\d+)/.exec(t);
      if (o && c.id === r.host && Number(o[1]) === r.round) r.encerrada = r.round;   // encerrada pelo árbitro: o resultado não vale
    } else {
      if (!this.balde(c, 'fala', 1, 4)) return this.erro(c, 'Calma: uma mensagem por segundo.');
      const agora = Date.now();
      const calado109 = this.v109Calado(c);             // v109: o silêncio da equipe vale na sala e no chat da equipe
      if (calado109) return this.erro(c, calado109, 'silenciado_staff');
      if ((r.silencio && r.silencio.get(c.id) || 0) > agora) return this.erro(c, 'Você está silenciado nesta sala por denúncias. Daqui a pouco você volta.', 'silenciado');   // v81
      if (c.ultTextoSala === t.toLowerCase() && agora - (c.ultSala || 0) < 30000) return this.erro(c, 'Essa mensagem é igual à anterior.', 'repetida');   // v81: spam
      if (filtrado(t)) return this.erro(c, 'O filtro do chat bloqueou essa mensagem.', 'filtro');
      c.ultTextoSala = t.toLowerCase(); c.ultSala = agora;
    }
    const eu = r.members.find(x => x.id === c.id);
    const msg = {type:'say', id:c.id, name:eu ? eu.name : c.nome, text:arb ? t : limpa(t, 120), t:Date.now()};
    if (!arb) msg.mid = r.code + '-' + (r.chatSeq = (r.chatSeq | 0) + 1);   // v81: o número da mensagem (para denunciar)
    if (arb) return this.diz(r, msg);
    if (m.canal === 'equipe'){                           // v88: o chat da EQUIPE (só o seu time vê; quem assiste não tem time)
      if (!eu || eu.slot < 0) return this.erro(c, 'Entre num time para falar com a sua equipe.', 'sem_time');
      msg.canal = 'equipe'; msg.equipe = Math.floor(eu.slot / r.n);
    }
    this.v88DizSala(r, msg, c);                          // v88: quem bloqueou (ou foi bloqueado) não recebe
  }
  report(c, m){                                          // v81: a denúncia de uma mensagem da sala: 2 pessoas diferentes escondem a mensagem e calam o autor por 5 min
    const r = this.salaDe(c); if (!r || typeof m.mid !== 'string' || !this.balde(c, 'denuncia', .5, 6)) return;
    const msg = r.hist.find(x => x && x.mid === m.mid); if (!msg || msg.id === c.id || msg.escondida) return;
    if (typeof msg.equipe === 'number' && this.v88TimeDe(r, c.id) !== msg.equipe) return;   // v88: (a mensagem da equipe dos outros você nem viu)
    const den = r.denuncias || (r.denuncias = new Map()), s = den.get(m.mid) || new Set();
    const quem = c.conta ? 'c' + c.conta.idPublico : c.id, nova = !s.has(quem);
    s.add(quem); den.set(m.mid, s);                      // (por conta ou por navegador — não por IP: no celular, milhares dividem o mesmo IP da operadora)
    this.log('sala ' + r.code + ': denúncia da mensagem ' + m.mid + ' (' + s.size + ')');
    if (nova){                                           // v88: com o motivo, para a plataforma (RACHA CONTROL)
      this.v88Denuncia(c, {autor:msg.id && msg.id[0] === 'c' ? String(Number(msg.id.slice(1))).padStart(6, '0') : null, motivo:this.motivo88(m), texto:msg.text, canal:msg.canal === 'equipe' ? 'equipe' : 'sala', mid:m.mid, sala:r.code});
      this.manda(c, {type:'denuncia_ok', mid:m.mid, ok:true});
    }
    if (s.size < 2) return;
    msg.escondida = true; (r.silencio || (r.silencio = new Map())).set(msg.id, Date.now() + 5*60e3);
    this.todos(r, {type:'say_hide', mid:m.mid});
  }
  typing(c, m){ const r = this.salaDe(c); if (!r || !this.balde(c, 'dig', 2, 5)) return; this.todos(r, {type:'typing', id:c.id, on:!!m.on}, c); }
  profile(c, m){                                         // trocou o nome, a tampinha ou o clube: o cartão da sala acompanha
    if (!this.balde(c, 'perfil', .5, 4)) return;
    const g = this.b.d.gente[c.id]; if (!g) return;
    if (!c.conta && typeof m.name === 'string') g.nome = c.nome = limpaNome(m.name);
    if (skinOk(m.skin)) g.skin = c.skin = m.skin;
    if (flagOk(m.flag)) g.flag = c.flag = m.flag;
    if (m.avatar !== undefined) c.avatar = avatarOk(m.avatar);
    if (m.clube !== undefined) c.clubeAnunciado = clubeAnunciado(m.clube);
    this.b.marca();
    const r = this.salaDe(c), eu = r && r.members.find(x => x.id === c.id);
    if (eu){ Object.assign(eu, {name:c.nome, selo:c.selo || '', skin:c.skin, flag:c.flag, avatar:c.avatar, club:this.cartaoClube(c), cos:this.v88Cos(c)}); this.salaMuda(r); }
  }
  social(c){
    const p = this.clubes.placar(), d = this.b.d, g = d.gente[c.id] || {st:{}}, meu = this.clubes.clubeDe(c.id), ct = this.clubes.cartao(c.id);
    const nome = id => (d.gente[id] || {}).nome || 'Jogador';
    const club = meu ? {id:meu.id, name:meu.nome, tag:ct.tag, color:ct.color, badge:'escudo', escudo:meu.escudo, points:p.por.get(meu.id) || 0, wins:p.por.get(meu.id) || 0,
      played:meu.membros.reduce((s, m) => s + ((d.gente[m.id] || {}).st || {}).jogos | 0, 0), members:meu.membros.map(m => ({id:m.id, name:nome(m.id)})), owner:meu.dono, invite:''} : null;
    const ranking = Object.values(d.clubes).map(k => ({name:k.nome, tag:(this.clubes.cartao(k.dono) || {}).tag || '', points:p.por.get(k.id) || 0, wins:p.por.get(k.id) || 0}))
      .sort((a, b) => b.points - a.points).slice(0, 20);
    const duels = Object.values(d.duelos).filter(x => x.a === c.id || x.b === c.id).sort((x, y) => y.ultimo - x.ultimo).slice(0, 8)
      .map(x => ({players:[{id:x.a, name:nome(x.a)}, {id:x.b, name:nome(x.b)}], wins:[x.va, x.vb], played:x.jogos}));
    this.manda(c, {type:'social', club, ranking, champions:d.campeoes.slice(-20).reverse(), duels, eu:{pub:String(g.pub || '').padStart(6, '0'), trofeus:g.st.vit | 0, jogos:g.st.jogos | 0}});
  }
  rtc(c, m){                                             // o aperto de mão da conexão direta: só repassa (dentro da mesma sala)
    const r = this.salaDe(c); if (!r || typeof m.to !== 'string' || !m.d || typeof m.d !== 'object' || !this.balde(c, 'rtc', 20, 80)) return;
    const txt = JSON.stringify(m.d); if (txt.length > 16000) return;
    const alvo = this.porId.get(m.to); if (!alvo || alvo.sala !== r.code) return;
    this.mandaTxt(alvo, '{"type":"rtc","from":' + JSON.stringify(c.id) + ',"d":' + txt + '}');
  }
  p2p(c, m){ c.p2p = !!m.on; }
  clubAntigo(c){ this.erro(c, 'Os clubes agora ficam em CLUBE (a mesma tela para todos): crie ou entre por lá.'); }
  club_req(c, m){                                        // os clubes (a mesma tela do jogo da conta do RACHA)
    const rid = typeof m.rid === 'number' || typeof m.rid === 'string' ? m.rid : 0;
    if (!this.balde(c, 'clube', 4, 16)) return this.manda(c, {type:'club_res', rid, ok:false, erro:'Calma: muitos pedidos seguidos.'});
    try {
      const data = this.clubes.op(this.gente(c.id), String(m.op || ''), m.args && typeof m.args === 'object' ? m.args : {});
      this.manda(c, {type:'club_res', rid, ok:true, data});
    } catch (e) {
      if (!(e instanceof Erro)) this.log('erro no clube: ' + (e && e.stack || e));
      this.manda(c, {type:'club_res', rid, ok:false, erro:e instanceof Erro ? e.message : 'Não deu certo. Tente de novo.'});
    }
  }

  /* ------------------------------------------------------------------ v92 · OFICINA: os mapas da comunidade e a sala com mapa */
  ehStaff(c){                                            // a equipe que modera os mapas: o selo 'equipe', o Dono e RACHA_MODERADORES
    if (!c) return false;
    if (c.selo === 'equipe') return true;
    if (c.conta && (c.conta.idPublico === '000001' || this.moderadores.has(c.conta.idPublico))) return true;
    return this.moderadores.has(c.id);
  }
  // quem é de CONFIANÇA para o catálogo dos mapas (as denúncias que tiram um mapa sozinhas, as curtidas que valem na ordem e
  // os mapas novos fora do teto por hora do servidor): a conta, a equipe ou quem joga sem conta aqui há 24 h e já jogou 3
  // partidas — quem abre conexões sem o token do aparelho vira "uma pessoa nova" a cada vez e não passa disso
  ehConfiavel(c){
    if (!c || !c.id) return false;
    if (c.conta || this.ehStaff(c)) return true;
    const g = this.b.d.gente[c.id];
    return !!(g && Date.now() - (g.criado || Date.now()) >= 864e5 && g.st && (g.st.jogos | 0) >= 3);
  }
  pessoaPorPub(pub){                                     // o ID público (o do cartão) → quem é no servidor das salas
    const t = String(pub == null ? '' : pub).replace(/\D/g, ''); if (!t || t.length > 9) return null;
    const n = Number(t); if (!n) return null;
    if (n < 9000000){ const id = 'c' + n, g = this.b.d.gente[id]; return {uid:id, nome:g ? g.nome : 'Jogador ' + String(n).padStart(6, '0'), pub:String(n).padStart(6, '0')}; }
    for (const [id, g] of Object.entries(this.b.d.gente)) if (g && g.pub === n) return {uid:id, nome:g.nome, pub:String(n)};
    return null;
  }
  mapaReq(c, m){                                         // o pedido da Oficina: {rid, op, args} → mapa_res {rid, op, ok, ...}
    const rid = typeof m.rid === 'number' || typeof m.rid === 'string' ? m.rid : 0, op = String(m.op || '').slice(0, 20);
    const a = m.args && typeof m.args === 'object' && !Array.isArray(m.args) ? m.args : {};
    const res = r => { const {ok, meta, ...resto} = r || {}; const o = Object.assign({type:'mapa_res', rid, op, ok:!!ok}, resto); if (meta && typeof meta === 'object' && !('dono' in meta)) o.meta = meta; this.manda(c, o); };
    if (!this.balde(c, 'mapa', 6, 24)) return res({ok:false, erro:'Calma: muitos pedidos seguidos.'});
    const quem = {id:c.id, nome:c.nome, staff:this.ehStaff(c), conta:!!c.conta, confiavel:this.ehConfiavel(c)};
    let r;
    try {
      switch (op){
        case 'eu': r = Object.assign({ok:true, id:c.id, staff:quem.staff, conta:!!c.conta, pub:String((this.b.d.gente[c.id] || {}).pub || '').padStart(6, '0')}, this.mapas.limitePublicos(quem)); break;
        case 'lista': r = this.mapas.lista(quem, a); break;
        case 'abrir': r = this.mapas.abrir(quem, a); break;
        case 'versoes': r = this.mapas.versoes(quem, a); break;
        case 'publicar':
          if (!this.balde(c, 'publicaMapa', .2, 3)) { r = {ok:false, erro:'Calma: espere um pouco para publicar de novo.'}; break; }
          r = this.mapas.publicar(quem, a); break;
        case 'curtir': r = this.mapas.curtir(quem, a, a.on !== false); break;
        case 'favorito': r = this.mapas.favoritar(quem, a, a.on !== false); break;
        case 'denunciar': {
          if (!this.balde(c, 'denunciaMapa', .2, 4)) { r = {ok:false, erro:'Calma: muitas denúncias seguidas.'}; break; }
          const d = this.mapas.denunciar(quem, a, a.motivo, a.texto);
          if (d.ok && d.nova && d.meta){                 // também para a plataforma (RACHA CONTROL), quando ela está montada aqui
            const meta = d.meta, dono = /^c\d+$/.test(meta.dono) ? String(Number(meta.dono.slice(1))).padStart(6, '0') : null;
            const mot = {ofensivo:'ofensa', copia:'outro', spam:'spam', quebrado:'bug', nome:'nome', outro:'outro'}[a.motivo] || 'outro';
            this.v88Denuncia(c, {autor:dono, motivo:mot, texto:'Mapa ' + meta.codigo + ' «' + meta.nome + '»: ' + limpa(a.texto, 200), canal:'mapa', mid:meta.id, sala:meta.codigo});
          }
          r = d.ok ? {ok:true, nova:!!d.nova, oculto:!!d.oculto} : d; break;
        }
        case 'apagar': r = this.mapas.apagar(quem, a); break;
        case 'config': r = this.mapas.config(quem, a, a.campos); break;
        case 'colab': {
          const alvo = this.pessoaPorPub(a.pub);
          r = alvo ? this.mapas.colaborador(quem, a, alvo, a.perms === null ? null : (a.perms && typeof a.perms === 'object' ? a.perms : {})) : {ok:false, erro:'Jogador não encontrado. Confira o ID dele (o número do cartão).'};
          break;
        }
        case 'moderar': r = this.mapas.moderar(quem, a, String(a.acao || '')); break;
        case 'fila': r = this.mapas.filaModeracao(quem); break;
        default: r = {ok:false, erro:'Pedido desconhecido.'};
      }
    } catch (e) { this.log('erro nos mapas: ' + (e && e.stack || e)); r = {ok:false, erro:'Não deu certo. Tente de novo.'}; }
    if (r && r.meta && r.meta.dono !== undefined) delete r.meta;   // (os dados internos do mapa nunca vão para o aparelho)
    res(r);
  }
  // o mapa que a sala vai jogar: {id|codigo} publicado (o servidor confere quem pode) ou o rascunho do editor (só sala fechada)
  mapaDaSala(c, m){
    const quem = {id:c.id, nome:c.nome, staff:this.ehStaff(c)};
    let mapa, info, privado = false;
    if (m.mapa && typeof m.mapa === 'object'){
      const p = this.mapas.paraSala(quem, m.mapa); if (!p.ok) return {erro:p.erro};
      mapa = p.mapa; privado = p.privado;
      info = {id:p.meta.id, codigo:p.meta.codigo, versao:p.versao, nome:p.meta.nome, autor:p.meta.donoNome, rascunho:false, privado, naoListado:p.meta.visibilidade === 'naoListado'};   // (não listado: o código não vai para a lista pública de salas)
    } else if (m.mapaDados && typeof m.mapaDados === 'object'){
      // (o rascunho inteiro passa pela validação e pela compilação: um balde só dele, além do geral)
      if (!this.balde(c, 'mapaDados', .2, 3)) return {erro:'Calma: espere uns segundos para mandar o mapa de novo.'};
      const l = RachaMapa.limpa(m.mapaDados); if (!l.ok) return {erro:'O mapa tem problemas: ' + (l.erros || []).slice(0, 2).join(' · ')};
      mapa = l.mapa; privado = true;
      info = {id:'', codigo:'', versao:mapa.versao | 0, nome:mapa.nome, autor:c.nome, rascunho:true, privado:true};
    } else return {erro:'Escolha um mapa.'};
    const P = mapa.partida;
    info.E = P.equipes; info.porMin = P.porMin; info.porMax = P.porMax; info.modo = P.modo; info.times = P.times;
    info.hash = hashMapa(mapa); info.fisicaSala = null; info.fisicaMapa = mapa.fisica;   // (a física do próprio mapa: os AJUSTES mostram "a do mapa")
    return {info, mapa, E:P.equipes, porMin:P.porMin, porMax:P.porMax, porTime:P.porTime, jogo:P.jogo, tempo:P.tempo, bots:P.bots, privado};
  }
  // v92 · OFICINA: a FÍSICA DA SALA — o admin escolhe, ao criar a sala ou nos AJUSTES (antes da partida), o tamanho e a
  // velocidade da bola, o freio, o peso, o quique, os chutes e as tampinhas: vale só nesta sala (o mapa publicado não muda,
  // a ranqueada e as salas comuns continuam com a física oficial). Passa pela mesma limpeza do mapa (RachaMapa.limpa, os
  // limites do núcleo) e o hash muda: cada aparelho recebe o mapa da sala de novo, e a previsão continua batendo com o servidor.
  comFisicaSala(base, f){
    if (f == null || f === false) return {mapa:base, fisica:null};
    if (typeof f !== 'object' || Array.isArray(f)) return {erro:'A física da sala veio errada.'};
    const fisica = RachaMapa.limpaFisica(f);
    const l = RachaMapa.limpa(Object.assign({}, base, {fisica}));
    if (!l.ok) return {erro:'A física da sala não deu certo: ' + (l.erros || []).slice(0, 2).join(' · ')};
    return {mapa:l.mapa, fisica:l.mapa.fisica};
  }
  poeFisicaSala(r, fx){ r.mapaDados = fx.mapa; r.custom = Object.assign({}, r.custom, {fisicaSala:fx.fisica, hash:hashMapa(fx.mapa)}); }
  mandaMapaSala(c, r){ if (r.custom && r.mapaDados) this.mandaTxt(c, this.mapaSalaTxt(r)); }
  mapaSalaTxt(r){                                        // (o mapa_sala já pronto em texto: a sala inteira e quem entra recebem o mesmo, sem refazer o JSON de até 200 KB para cada um)
    const k = r.custom, d = r.mapaDados;
    if (r._msTxt && r._msK === k && r._msD === d && r._msH === k.hash && r._msC === r.code) return r._msTxt;
    r._msTxt = JSON.stringify({type:'mapa_sala', code:r.code, hash:k.hash, info:k, mapa:d}); r._msK = k; r._msD = d; r._msH = k.hash; r._msC = r.code;
    return r._msTxt;
  }
  configMapa(c, r, m){                                   // o admin mexe na sala com mapa (ou troca o mapa, ou põe um na sala comum)
    if (r.tournament) return this.erro(c, 'Encerre a copa antes de trocar o mapa.');
    // (primeiro confere tudo — o mapa novo e a física da sala —, depois muda: um pedido recusado não deixa a sala pela metade)
    const pedeMapa = !!(m.mapa || m.mapaDados);
    let mp = null, fx = null;
    if (pedeMapa){
      if (!this.balde(c, 'trocaMapa', .5, 4)) return this.erro(c, 'Calma: espere um pouco para trocar o mapa de novo.');   // (cada troca valida, compila e manda o mapa inteiro para a sala)
      mp = this.mapaDaSala(c, m); if (mp.erro) return this.erro(c, mp.erro, 'mapa');
      if (r.custom && mp.info.hash === r.custom.hash && mp.E === r.E) mp = null;   // (o mesmo mapa, com a física dele: nada a trocar)
    }
    const temMapa = mp ? true : (m.semMapa === true && !pedeMapa) ? false : !!r.custom;
    if (temMapa && m.fisicaSala !== undefined){           // a física da sala (null = a do mapa)
      if (!this.balde(c, 'fisicaSala', .5, 4)) return this.erro(c, 'Calma: espere um pouco para mudar a física de novo.');
      fx = this.comFisicaSala(mp ? mp.mapa : (r.mapaBase || r.mapaDados), m.fisicaSala); if (fx.erro) return this.erro(c, fx.erro, 'mapa');
    }
    let trocou = false;
    if (mp){
      const n = inteiro(m.n, mp.porMin, mp.porMax, mp.porTime);   // (o tamanho do time que o mapa sugere)
      this.novoN(r, n, mp.E); r.E = mp.E; r.custom = mp.info; r.mapaDados = r.mapaBase = mp.mapa; r.jogo = mp.jogo; r.tempo = mp.tempo;   // (o mapa novo começa com a física dele)
      r.chutes = null;                                   // v99: a sala com mapa da Oficina não tem os chutes do Rachão (a partida é a do mapa)
      if (mp.privado) r.pub = false;
      trocou = true;
    } else if (Number.isInteger(m.n) && r.custom && m.n !== r.n && m.n >= r.custom.porMin && m.n <= r.custom.porMax) this.novoN(r, m.n);
    if (m.semMapa === true && r.custom && !pedeMapa){     // volta para os campos do RACHA
      this.novoN(r, Math.min(4, r.n), 2); delete r.E; r.custom = null; r.mapaDados = r.mapaBase = null; r.jogo = 'futebol'; r.tempo = 0; r.rankOff = false;
    }
    if (typeof m.rankOff === 'boolean' && r.custom) r.rankOff = m.rankOff;   // v95: o RANK OFF (só nas salas com mapa da Oficina)
    if (r.custom && linhasDoMapa(r.mapaBase || r.mapaDados)) r.rankOff = false;   // (o mapa já mostra as linhas para todos: a partida conta normal)
    if (fx && r.custom){
      const antes = r.custom.hash; this.poeFisicaSala(r, fx);
      if (r.custom.hash !== antes) trocou = true;          // (o mapa da sala vai de novo para todo mundo)
    }
    // (v103: os bots não voltam pela configuração: as salas personalizadas não têm bots)
    if (typeof m.pub === 'boolean') r.pub = m.pub && !(r.custom && r.custom.privado);
    if (typeof m.name === 'string' && limpa(m.name, 24)) r.name = limpa(m.name, 24);
    if (trocou) for (const x of r.members){ const cl = this.porId.get(x.id); if (cl && cl.sala === r.code) this.mandaMapaSala(cl, r); }
    this.salaMuda(r);
  }
  ligaPartidaMapa(r){                                    // a partida no mapa: os humanos nos lugares, bots (ou ninguém) nas vagas
    r.pid = novoId('p', 9);
    const jogadores = [];
    for (let i = 0; i < r.roster.length; i++){
      const id = r.roster[i], x = id && r.members.find(mm => mm.id === id);
      jogadores.push(x ? {netId:x.id, nome:x.name} : r.bots ? {bot:'dificil', nome:'Bot'} : {vazio:true});
    }
    const E = r.E || 2;
    const p = new PartidaMapa({
      mapa:r.mapaDados, porTime:r.n, jogadores, bots:!!r.bots, seed:require('crypto').randomBytes(4).readUInt32LE(0) || 1, saida0:Math.floor(Math.random()*E),
      agora:() => this.agora(), log:t => this.log(t), quadros:r.quadros === 60 ? 60 : 30,
      suspeito:(id, tipo, det) => this.log('suspeito na sala ' + r.code + ': ' + id + ' ' + tipo + (det ? ' (' + det + ')' : '')),
      onSnapshot:data => {
        r.ultimo = {score:data.sc.slice(), elapsed:data.el, tick:data.tick, state:data.st};
        this.todos(r, {type:'snapshot', round:r.round, data});
      },
      onGol:g => {
        if (g.author && g.time >= 0) r.gols[g.author] = (r.gols[g.author] | 0) + (g.pts | 0 || 1);
        if (g.assist){ r.assist = r.assist || {}; r.assist[g.assist] = (r.assist[g.assist] | 0) + 1; }
        if (r.pub) this.listaMudou();
      },
      onAviso:txt => this.diz(r, {type:'say', sys:true, who:'', text:txt, t:Date.now()}),
      onFim:res => this.encerraServidor(r, res),
    });
    r.partida = p;
    p.ligar();
    this.log('sala ' + r.code + ': partida no mapa «' + r.custom.nome + '» (' + (r.custom.codigo || 'rascunho') + ', ' + E + ' times de ' + r.n + ')');
  }
  ligaPartidaRachao(r){                                  // v98: a partida do Rachão — os humanos nos lugares, bots (ou ninguém) nas vagas
    r.pid = novoId('p', 9);
    const rc = r.rachao, jogadores = [];
    for (let i = 0; i < 2*r.n; i++){
      const id = r.roster[i], x = id && r.members.find(mm => mm.id === id);
      jogadores.push(x ? {netId:x.id, nome:x.name} : r.bots ? {bot:true} : {vazio:true});
    }
    const p = new RCH.PartidaRachao({
      mapa:rc.mapa, opc:rc.opc, porTime:r.n, jogadores, agora:() => this.agora(), log:t => this.log(t), quadros:r.quadros === 60 ? 60 : 30,
      suspeito:(id, tipo, det) => this.log('suspeito na sala ' + r.code + ': ' + id + ' ' + tipo + (det ? ' (' + det + ')' : '')),
      onSnapshot:d => {
        r.ultimo = {score:d.s.slice(), elapsed:d.tm, tick:d.t, state:String(d.f)};
        this.todos(r, {type:'rq', round:r.round, d});
      },
      onGol:g => {
        if (g.author) r.gols[g.author] = (r.gols[g.author] | 0) + 1;
        if (g.assist){ r.assist = r.assist || {}; r.assist[g.assist] = (r.assist[g.assist] | 0) + 1; }
        if (r.pub) this.listaMudou();
        this.painelLogo(r);
      },
      onAviso:txt => this.diz(r, {type:'say', sys:true, who:'', text:txt, t:Date.now()}),
      onFim:res => this.encerraServidor(r, res),
    });
    r.partida = p;
    p.ligar();
    this.log('sala ' + r.code + ': partida do Rachão «' + rc.info.nome + '» (' + RCH.resumo(rc.info, rc.opc, r.n) + ')');
  }
  encerraRachao(r, res){                                 // v98: o fim da partida do Rachão: o resultado vale para a sala (sem selo, XP nem troféu)
    if (r.pausa){ r.pausadoMs += this.agora() - r.pausa; r.pausa = null; }
    const valida = r.encerrada !== r.round, dur = Math.round((this.agora() - r.inicio - r.pausadoMs)/1000);
    r.state = 'ended';
    const placar = Array.isArray(res.placar) ? res.placar.slice(0, 2) : [0, 0], winner = res.vencedor === 0 || res.vencedor === 1 ? res.vencedor : -1;
    this.log('sala ' + r.code + ' rodada ' + r.round + ' (Rachão): ' + placar.join('×') + (valida ? '' : ' (encerrada pelo admin)'));
    const jog = Array.isArray(res.jog) ? res.jog.map(j => ({i:j.i, time:j.time, nome:j.nome, gols:j.gols | 0, assist:j.assist | 0, bot:!!j.bot, id:j.netId || null})) : [];
    for (const x of r.members){
      if (x.bot) continue;
      const cl = this.porId.get(x.id); if (!cl || cl.sala !== r.code) continue;
      const msg = {type:'result', round:r.round, score:placar, winner, valida, rachao:true, oficial:false, servidor:true, duracao:dur, tempo:res.tempo | 0, jog};
      if (!valida) msg.motivo = 'encerrada pelo admin';
      this.manda(cl, msg);
    }
    this.salaMuda(r);
  }
  encerraMapa(r, res){                                   // o fim da partida no mapa: o resultado vale para a sala (sem selo, XP nem troféu)
    if (r.pausa){ r.pausadoMs += this.agora() - r.pausa; r.pausa = null; }
    const valida = r.encerrada !== r.round, dur = Math.round((this.agora() - r.inicio - r.pausadoMs)/1000);
    r.state = 'ended';
    const placar = Array.isArray(res.placar) ? res.placar.slice() : [], winner = Number.isInteger(res.vencedor) ? res.vencedor : -1;
    if (valida && r.custom.id && dur >= 30 && !r.rankOff) for (const id of r.roster) if (id) this.mapas.contaJogo(r.custom.id, id);   // v95: com o RANK OFF não conta nas jogadas do mapa
    this.log('sala ' + r.code + ' rodada ' + r.round + ' (mapa ' + (r.custom.codigo || 'rascunho') + '): ' + placar.join('×') + (valida ? '' : ' (encerrada pelo admin)'));
    const jog = Array.isArray(res.jog) ? res.jog.map(j => ({i:j.i, time:j.time, nome:j.nome, gols:j.gols | 0, assist:j.assist | 0, bot:!!j.bot, vazio:!!j.vazio, id:j.netId || null})) : [];
    for (const x of r.members){
      if (x.bot) continue;
      const cl = this.porId.get(x.id); if (!cl || cl.sala !== r.code) continue;
      const msg = {type:'result', round:r.round, score:placar, winner, valida, custom:true, oficial:false, servidor:true, duracao:dur, jog, rankOff:!!r.rankOff};
      if (!valida) msg.motivo = 'encerrada pelo admin';
      this.manda(cl, msg);
    }
    this.salaMuda(r);
  }
  mapaEncerrar(c){                                       // o admin encerra a partida no mapa (o resultado não vale)
    const r = this.salaDe(c); if (!r || !r.custom || r.host !== c.id || r.state !== 'playing') return;
    const p = r.partida, P = p && p.P;
    r.encerrada = r.round;
    this.v93Limpa(r);                                    // v93: a contagem (e o replay) não ficam pendurados
    if (p){ p.aborta(); p.desligar(); r.partida = null; }
    this.encerraMapa(r, {placar:P ? P.placar.slice() : [], vencedor:-1, jog:P ? P.jog.map(q => ({i:q.i, time:q.time, nome:q.nome, netId:q.netId, gols:q.golsFeitos | 0, assist:q.assist | 0, bot:!!q.bot, vazio:!!q.vazio})) : []});
  }

  /* ------------------------------------------------------------------ v79: a fila da ranqueada */
  fila(c, m){
    if (!this.balde(c, 'fila', .5, 4)) return this.erro(c, 'Calma: espere um pouco para procurar de novo.');
    if (this.salaDe(c)) return this.erro(c, 'Saia da sala em que você está para jogar a ranqueada.', 'fila_sala');
    if (c.velho105) return this.erro(c, AVISO_V105, 'jogo_velho');   // v105: a página de antes (a física das salas mudou)
    const n = inteiro(m.n, 1, 4, 2), pts = inteiro(m.pts, 0, 99999, 0);
    this.filaEsp.set(c.id, {c, n, pts, t0:this.agora()});
    this.manda(c, {type:'fila', on:true, n, espera:FILA_MAX_MS, mista:FILA_MISTA_MS, online:this.porId.size});
    this.v88Marca(c);                                    // v88: "procurando partida" para os amigos
    this.filaTenta();
  }
  filaSai(c){ if (this.filaEsp.delete(c.id)){ this.manda(c, {type:'fila', on:false}); this.v88Marca(c); } }
  filaTenta(){                                           // junta quem está esperando: o tamanho cheio na hora; depois de 8 s, 2 ou mais com bots; 20 s sem ninguém, fila_nada
    clearTimeout(this.filaT); this.filaT = null;
    const agora = this.agora();
    for (const [id, e] of this.filaEsp) if (!e.c.ws || e.c.ws.readyState !== 1 || e.c.sala || this.porId.get(id) !== e.c) this.filaEsp.delete(id);
    for (let n = 1; n <= 4; n++){
      let L = [...this.filaEsp.values()].filter(e => e.n === n).sort((a, b) => a.t0 - b.t0);
      while (L.length >= 2*n){ const g = this.filaGrupo(L, 2*n); this.filaSala(g, n); L = L.filter(e => g.indexOf(e) < 0); }
      if (n >= 2 && L.length >= 2 && agora - L[0].t0 >= FILA_MISTA_MS){ const g = this.filaGrupo(L, Math.min(L.length, 2*n)); this.filaSala(g, n); L = L.filter(e => g.indexOf(e) < 0); }
      // v103: ninguém apareceu — a ranqueada contra os bots roda AQUI, no servidor (o resultado tem o selo e vale pontos, com o
      // teto do dia contra os bots); antes ia fila_nada e o jogo jogava no aparelho, sem valer nada na conta (v100)
      for (const e of L) if (agora - e.t0 >= FILA_MAX_MS) this.filaSala([e], n);
    }
    if (this.filaEsp.size){ this.filaT = setTimeout(() => this.filaTenta(), 1000); if (this.filaT.unref) this.filaT.unref(); }
  }
  filaBots(c){                                           // v103: o JOGAR CONTRA BOTS AGORA da busca — a ranqueada com os bots já, no servidor
    const e = this.filaEsp.get(c.id); if (!e) return this.manda(c, {type:'fila', on:false});
    if (e.grp && typeof this.g93Joga === 'function'){    // (o grupo: o líder pede para todos, e o grupo fica junto no mesmo time)
      const U = typeof this.g93Unidades === 'function' ? this.g93Unidades(e.n) : null, u = U && U.find(x => x.es.some(y => y.c.id === c.id));
      if (u && this.g93Joga([u], e.n)) return;
      return;
    }
    this.filaSala([e], e.n);
  }
  filaGrupo(L, k){                                       // quem espera há mais tempo e os de pontos mais perto dele
    const a = L[0], resto = L.slice(1).sort((x, y) => Math.abs(x.pts - a.pts) - Math.abs(y.pts - a.pts) || x.t0 - y.t0);
    return [a].concat(resto.slice(0, k - 1));
  }
  filaSala(g, n, times){                                 // a sala ranqueada: os times pelos pontos (um pra cá, dois pra lá…), os bots nas vagas, e começa · v93: times = o time de cada um (o grupo junto)
    for (const e of g) this.filaEsp.delete(e.c.id);
    const r = {code:this.codigo(), name:'Ranqueada', host:g[0].c.id, n, map:MAPA_RANQUEADA, jogo:'futebol', tempo:Math.max(1, Math.round(this.r80.seg/60)), regra:'v80', bots:true, pub:false, ranked:true, servidor:true,
      state:'waiting', round:0, roster:new Array(2*n).fill(null), members:[], tournament:null, hist:[], reservas:new Map(), removidos:new Map(),
      inicio:0, pausa:null, pausadoMs:0, ultimo:null, gols:{}, assist:{}, linha:[], encerrada:-1, interrompida:-1, vaziaAte:0, criada:Date.now()};   // v80: 3:00 no relógio do servidor
    this.salas.set(r.code, r);
    const ord = g.slice().sort((a, b) => b.pts - a.pts), poe = [0, 0];
    ord.forEach((e, i) => {
      let t = times && times.has(e) ? times.get(e) : [0, 1, 1, 0][i % 4]; if (poe[t] >= n) t = 1 - t;
      const m = this.membro(e.c); r.members.push(m); this.senta(r, m, t*n + poe[t]++);
      e.c.sala = r.code;
    });
    Object.assign(r, {state:'playing', inicio:this.agora(), round:1});
    this.ligaPartida(r);                               // v83: a ranqueada também é 100% hospedada (nenhuma partida usa a física do aparelho)
    for (const e of g) this.manda(e.c, {type:'sayHistory', list:[]});
    this.todos(r, {type:'room', room:this.publica(r)});
    this.todos(r, {type:'start', room:this.publica(r)});
    this.contagem(r);                                    // v93: 3, 2, 1, JÁ! também na ranqueada
    this.v88MarcaSala(r);                                // v88: "em partida" para os amigos
    this.log('ranqueada ' + r.code + ' (' + n + 'v' + n + '): ' + g.length + ' de ' + 2*n + (g.length < 2*n ? ', bots completam' : ''));
    return r;
  }

  /* ------------------------------------------------------------------ a copa dos amigos (1v1, 4 ou 8 pessoas) */
  cupCreate(c, m){
    const r = this.salaDe(c); if (!r) return;
    if (r.host !== c.id) return this.erro(c, 'Quem criou a sala sorteia a copa.');
    if (r.state === 'playing') return this.erro(c, 'Espere a partida acabar para sortear a copa.');
    if (r.tournament) return this.erro(c, 'Já tem uma copa nesta sala.');
    if (r.custom) return this.erro(c, 'A copa dos amigos é só nos campos do RACHA (a sala está com um mapa da Oficina).');
    if (r.rachao) return this.erro(c, 'A copa dos amigos é só nos campos do RACHA (esta sala é do Rachão).');   // v98
    const gente = r.members.filter(x => !x.bot);
    if (gente.length !== 4 && gente.length !== 8) return this.erro(c, 'A copa precisa de 4 ou 8 pessoas na sala (agora tem ' + gente.length + ').');
    const ids = embaralha(gente.map(x => x.id)), matches = [];
    for (let i = 0; i < ids.length; i += 2) matches.push({a:ids[i], b:ids[i + 1]});
    r.tournament = {name:limpa(m.name, 28) || 'Copa dos amigos', rounds:[], matches, champion:null, n:r.n, bots:r.bots};
    r.n = 1; r.bots = false; r.state = 'waiting';
    this.copaSenta(r);
    this.diz(r, {type:'say', sys:true, text:'Copa sorteada: ' + matches.map(j => this.nomeNaSala(r, j.a) + ' × ' + this.nomeNaSala(r, j.b)).join(' · '), t:Date.now()});
    this.salaMuda(r);
  }
  nomeNaSala(r, id){ const x = r.members.find(y => y.id === id); return x ? x.name : (this.b.d.gente[id] || {}).nome || 'Jogador'; }
  copaSenta(r){                                          // o próximo duelo sem vencedor da rodada: os dois nos times, o resto assiste
    r.roster = [null, null]; for (const x of r.members) x.slot = -1;
    const j = r.tournament.matches.find(x => !x.winner); if (!j) return null;
    const a = r.members.find(x => x.id === j.a), b = r.members.find(x => x.id === j.b);
    if (a) this.senta(r, a, 0); if (b) this.senta(r, b, 1);
    return j;
  }
  copaResultado(r, score, winner){
    const j = r.tournament.matches.find(x => !x.winner);
    if (!j || winner < 0 || r.roster[0] !== j.a || r.roster[1] !== j.b) return;   // (empate ou lugares trocados: o duelo se joga de novo)
    j.score = score.slice(); j.winner = winner === 0 ? j.a : j.b;
  }
  cupNext(c){
    const r = this.salaDe(c); if (!r || r.host !== c.id || !r.tournament || r.state === 'playing') return;
    const t = r.tournament; if (t.champion) return;
    const esta = id => r.members.some(x => x.id === id);
    for (let volta = 0; volta < 8; volta++){
      let j = t.matches.find(x => !x.winner);
      while (j && (!esta(j.a) || !esta(j.b))){            // quem foi embora da sala perde por W.O.
        j.winner = esta(j.a) ? j.a : esta(j.b) ? j.b : j.a; j.wo = true;
        this.diz(r, {type:'say', sys:true, text:this.nomeNaSala(r, j.winner) + ' passou por W.O.', t:Date.now()});
        j = t.matches.find(x => !x.winner);
      }
      if (j){ this.copaSenta(r); r.state = 'waiting'; return this.salaMuda(r); }
      const venc = t.matches.map(x => x.winner);
      t.rounds.push(t.matches);
      if (venc.length === 1){                            // CAMPEÃO
        t.champion = venc[0]; t.matches = [];
        r.roster = [null, null]; for (const x of r.members) x.slot = -1;
        r.state = 'ended';
        this.b.d.campeoes.push({name:t.name, champion:{name:this.nomeNaSala(r, t.champion)}, date:Date.now()});
        if (this.b.d.campeoes.length > 100) this.b.d.campeoes.shift();
        this.b.marca();
        this.diz(r, {type:'say', sys:true, text:'CAMPEÃO DA ' + t.name.toUpperCase() + ': ' + this.nomeNaSala(r, t.champion) + '!', t:Date.now()});
        return this.salaMuda(r);
      }
      t.matches = [];
      for (let i = 0; i < venc.length; i += 2) t.matches.push({a:venc[i], b:venc[i + 1]});
    }
  }
  cupEnd(c){
    const r = this.salaDe(c); if (!r || r.host !== c.id || !r.tournament || r.state === 'playing') return;
    const t = r.tournament; r.tournament = null;
    r.n = t.n || 1; r.bots = !!t.bots; r.roster = new Array(2*r.n).fill(null); for (const x of r.members) x.slot = -1;
    r.state = 'waiting';
    this.salaMuda(r);
  }

  /* ------------------------------------------------------------------ o Chat do Brasil (o mesmo endereço, outra conexão) */
  brasilRecebe(c, m){
    if (m.type === 'brasil_join'){
      const conta = c.contaSessao || this.bilhete(m.conta);
      if (this.bilheteDeAntes(c, conta)){                 // v100: a conta suspensa/banida também não entra no chat
        this.erro(c, 'Esta conta está suspensa no RACHA.', 'conta_suspensa');
        try { c.ws.close(4003, 'conta suspensa'); } catch (_) {}
        return;
      }
      if (conta && conta !== c.contaSessao) this.v109DoBilhete(conta);   // v109: o silêncio da equipe que veio no bilhete
      let id = conta ? 'c' + Number(conta.idPublico) : null;
      if (!id && typeof m.token === 'string' && m.token.length <= 80) id = this.b.d.tokens[sha(m.token)] || null;
      if (!conta && id && id[0] === 'c') id = null;      // v100: como no hello — o lugar da conta só com a conta (o token do aparelho, não)
      c.brasil = true; c.brasilId = id || c.brasilId || novoId('b', 9); c.brasilConta = id;
      c.nome = conta ? conta.nome : limpaNome(m.name); c.skin = skinOk(m.skin); c.avatar = avatarOk(m.avatar); c.selo = conta ? conta.selo || '' : '';
      // v88: as relações da conta (o bloqueio vale aqui também) e o histórico sem o texto das mensagens escondidas
      return this.v88BrasilEntrou(c, conta, () => {
        this.manda(c, {type:'brasil_hello', id:c.brasilId});
        this.manda(c, {type:'brasil_history', messages:this.v88HistBrasil(c)});
        this.brasilOnline();
      });
    }
    if (!c.brasil) return;
    if (m.type === 'brasil_say'){
      const t = String(m.text == null ? '' : m.text).replace(/\s+/g, ' ').trim(); if (!t) return;
      const agora = Date.now(), erro = reason => this.manda(c, {type:'brasil_error', reason});
      if (Array.from(t).length > 120) return erro('longa');
      if ((this.chat.silencio.get(c.brasilId) || 0) > agora) return erro('silenciado');
      const calado109 = this.v109Calado(c);             // v109: o silêncio da equipe (o aviso com quanto falta e o motivo)
      if (calado109) return this.manda(c, {type:'brasil_error', reason:'silenciado', texto:calado109});
      if (agora - c.ultBrasil < 2800) return erro('ritmo');
      if (t.toLowerCase() === c.ultTextoBrasil) return erro('repetida');
      if (filtrado(t)) return erro('filtro');
      c.ultBrasil = agora; c.ultTextoBrasil = t.toLowerCase();
      const ct = c.brasilConta ? this.clubes.cartao(c.brasilConta) : null;
      const msg = {id:'m' + (++this.chat.seq), from:c.brasilId, nome:c.nome, selo:c.selo || '', clube:ct ? ct.name : '', skin:c.skin, avatar:c.avatar, texto:limpa(t, 120), t:agora};
      this.chat.msgs.push(msg); if (this.chat.msgs.length > 50) this.chat.msgs.shift();
      const txt = JSON.stringify({type:'brasil_message', message:msg});
      const eu = c.brasilConta && c.brasilConta[0] === 'c' ? String(Number(c.brasilConta.slice(1))).padStart(6, '0') : null;
      for (const x of this.clientes) if (x.brasil && (x === c || !eu || !this.v88BloqueadoBrasil(x, eu))) this.mandaTxt(x, txt);   // v88: o bloqueio vale no Chat do Brasil
      return;
    }
    if (m.type === 'brasil_report'){                     // 3 denúncias de pessoas diferentes: some e o autor fica 10 min sem falar
      const msg = this.chat.msgs.find(x => x.id === m.id);
      if (!msg || msg.from === c.brasilId || msg.escondida) return;
      if (!this.balde(c, 'denuncia', .5, 6)) return;
      const s = this.chat.denuncias.get(msg.id) || new Set(), quem = c.brasilConta || c.brasilId, nova = !s.has(quem);
      s.add(quem); this.chat.denuncias.set(msg.id, s);   // v81: por conta ou por navegador (não por IP: na operadora, milhares dividem o mesmo)
      if (nova){                                         // v88: com o motivo, para a plataforma (RACHA CONTROL)
        const autor = typeof msg.from === 'string' && /^c\d+$/.test(msg.from) ? String(Number(msg.from.slice(1))).padStart(6, '0') : null;
        this.v88Denuncia(c, {autor, motivo:this.motivo88(m), texto:msg.texto, canal:'brasil', mid:msg.id});
        this.manda(c, {type:'brasil_report_ok', id:msg.id});
      }
      if (s.size < 3) return;
      msg.escondida = true; this.chat.silencio.set(msg.from, Date.now() + 10*60e3);
      const txt = JSON.stringify({type:'brasil_hide', id:msg.id});
      for (const x of this.clientes) if (x.brasil) this.mandaTxt(x, txt);
    }
  }
  brasilOnline(){                                        // quantos estão no chat (no máximo uma vez por segundo)
    if (this.chat.onT) return;
    this.chat.onT = setTimeout(() => {
      this.chat.onT = 0;
      const lista = [...this.clientes].filter(x => x.brasil), txt = JSON.stringify({type:'brasil_online', count:lista.length});
      for (const x of lista) this.mandaTxt(x, txt);
    }, 300);
  }
}
Turma.ACOES = {list:'list', create:'create', join:'join', leave:'leave', seat:'seat', config:'config', ready:'ready', rematch:'rematch', start:'start',
  pause:'pause', finish:'finish', kick:'kick', promote:'promote', say:'say', typing:'typing', profile:'profile', social:'social', rtc:'rtc', p2p:'p2p', report:'report',
  replay_pula:'replayPula', banco:'banco',              // v93: o voto para pular o replay e o banco de reservas
  adm:'adm',                                            // v93 · Fase 3: as ações do admin da sala
  fala:'fala',                                          // v93 · Fase 5: os balões de fala rápida
  club_req:'club_req', clubCreate:'clubAntigo', clubJoin:'clubAntigo', clubLeave:'clubAntigo', cupCreate:'cupCreate', cupNext:'cupNext', cupEnd:'cupEnd',
  fila:'fila', fila_sai:'filaSai', fila_bots:'filaBots',   // v103: a ranqueada contra os bots no servidor, já
  // v93 · Fase 4: o grupo (server/grupo93.js)
  grupo_cria:'grupo_cria', grupo_estado:'grupo_estado', grupo_convida:'grupo_convida', grupo_resposta:'grupo_resposta', grupo_sai:'grupo_sai',
  grupo_expulsa:'grupo_expulsa', grupo_lider:'grupo_lider', grupo_modo:'grupo_modo', grupo_pts:'grupo_pts',
  grupo_pronto:'grupo_pronto', grupo_denovo:'grupo_denovo',   // v95: o PRONTO do lobby e o JOGAR DE NOVO do grupo
  // v88: o social ao vivo (server/social88.js)
  relacoes:'relacoes', amigos_status:'amigos_status', convite:'convite', convite_resposta:'convite_resposta', dm:'dm', dm_hist:'dm_hist',
  clube_say:'clube_say', clube_hist:'clube_hist', chat_denuncia:'chat_denuncia',
  // v92 · OFICINA: o catálogo dos mapas (lista, abrir, publicar, curtir, favoritar, denunciar, versões, colaboradores, moderação)
  mapa_req:'mapaReq', mapa_encerrar:'mapaEncerrar'};
social88.aplica(Turma);
fundador96.aplica(Turma);                             // v96 (depois do social: confere a tampinha quando as relações da conta chegam)
social88.configura({maxGente:MAX_GENTE, filtrado});
grupo93.aplica(Turma);                                 // v93 · Fase 4 (depois do social: o grupo usa os amigos, o bloqueio e o status)
grupo93.configura({filaMax:FILA_MAX_MS, filaMista:FILA_MISTA_MS});
fila95.aplica(Turma);                                  // v95 (depois do grupo: a volta da fila é a dele)
emotes106.aplica(Turma);                               // v106: os emojis da partida (server/emotes106.js)
require('./convite107').aplica(Turma, {maxGente:MAX_GENTE, maxGenteMapa:MAX_GENTE_MAPA});   // v107: o convite pelo chat, para quem não é amigo também (server/convite107.js)
silencio109.aplica(Turma);                             // v109: o silêncio da equipe nos chats e a expulsão da sala (server/silencio109.js)

/* a página que abriu o jogo pode falar com o servidor? Mesmo endereço do servidor e o próprio computador (localhost) sempre;
   outras só se estiverem na lista (RACHA_ORIGENS / --origens). Sem cabeçalho Origin (programa, não navegador): pode. */
function origemPermitida(origem, host, lista){
  if (!origem) return true;
  if (Array.isArray(lista) && (lista.includes(origem) || lista.includes('*'))) return true;
  let u; try { u = new URL(origem); } catch (_) { return false; }   // ('null': arquivo aberto direto ou iframe isolado; só pela lista)
  if (host && u.host === String(host).toLowerCase()) return true;
  return ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname);
}

module.exports = {Turma, origemPermitida, MODOS, MODOS_SALA, MAPAS_SALA, N_MAPAS, META, MAX_PTS, MAPA_RANQUEADA, FILA_MAX_MS, FILA_MISTA_MS, SELOS, seloDe, REGRA80, TOL80};
