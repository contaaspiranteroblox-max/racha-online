// RACHA v82 · uma PLATAFORMA DE MENTIRA para testar o jogo com conta, sem o MySQL (que não roda aqui).
// Serve a pasta do projeto (o jogo e tests/v82_plataforma.html, a página-mãe que faz o papel do app/src/lib/ponteJogo.ts) e uma
// API em /api82/* que guarda tudo na memória e usa AS MESMAS regras do servidor de verdade: app/contracts/patentes.ts (a conta da
// patente), app/contracts/partida.ts (o que a partida faz com a patente; o selo online) e app/contracts/progresso.ts (a cópia do
// progresso) — o Node 22.18+ lê o TypeScript direto. O que NÃO é o de verdade: o banco (aqui, mapas na memória), a sessão (a
// página diz qual conta está logada), a assinatura do selo (aqui o selo é o JSON dele, sem HMAC: a assinatura é testada no
// servidor_test.js) e o XP (a mesma conta do jogoRouter, sem os tetos do dia).
//   node tests/plataforma82_falsa.mjs <porta>
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pontuaRanqueada, patenteDe, patenteImportada, normalizaEstado, ESTADO_RQ_INICIAL } from '../app/contracts/patentes.ts';
import { motivoResultadoOnline, acaoRanqueada } from '../app/contracts/partida.ts';
import { validaProgresso } from '../app/contracts/progresso.ts';
import { XP, nivelPorXp, progressoNivel } from '../app/contracts/racha.ts';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORTA = Number(process.argv[2] || 8682);
const hoje = () => new Date().toISOString().slice(0, 10);
const E = { contas: new Map(), partidas: new Map(), log: [], atraso: {} };
const VALIDADE_MS = 30 * 60 * 1000;                           // (o token de partida vale 30 min, como no jogoRouter)
function conta(id){
  id = Number(id); if (!id) return null;
  if (!E.contas.has(id)) E.contas.set(id, { id, idPublico: String(id).padStart(6, '0'), nome: 'Conta' + id, xp: 0, nivel: 1, rq: { ...ESTADO_RQ_INICIAL }, importado: false,
    botsDia: '', botsGanho: 0, nuvem: null, eventos: [], publico: true, selos: [] });
  return E.contas.get(id);
}
const info = pts => { const p = patenteDe(pts); return { id: p.id, nome: p.nome, divisao: p.divisao, titulo: p.titulo, ordem: p.ordem, min: p.min, prox: p.prox, pct: p.pct }; };
function contaJogo(c){
  if (!c) return null;
  const pr = progressoNivel(c.xp);
  return { idPublico: c.idPublico, nome: c.nome, tampa: null, selos: c.selos.slice(), nivel: c.nivel, xp: c.xp, nivelInfo: { n: pr.nivel, atual: pr.atual, prox: pr.necessario },
    rq: { ...c.rq, importado: c.importado } };
}
function aplica(c, ref, partida, extra){                     // (o ranqueada.ts: uma vez por referência, o teto do dia contra os bots)
  const ja = c.eventos.find(e => e.referencia === ref);
  if (ja) return { antes: ja.antes, depois: ja.depois, delta: ja.delta, motivo: ja.motivo, subiu: false, caiu: false, limitado: ja.limitado, duplicada: true, patente: info(c.rq.pts), estado: { ...c.rq } };
  const ganhoHoje = c.botsDia === hoje() ? c.botsGanho : 0;
  const r = pontuaRanqueada(c.rq, partida, ganhoHoje);
  c.rq = r.estado; c.botsDia = hoje(); c.botsGanho = r.ganhoBots;
  c.eventos.push({ referencia: ref, motivo: r.motivo, antes: r.antes, delta: r.delta, depois: r.depois, limitado: r.limitado, online: extra.online, tamanho: extra.tamanho });
  return { antes: r.antes, depois: r.depois, delta: r.delta, motivo: r.motivo, subiu: r.subiu, caiu: r.caiu, limitado: r.limitado, duplicada: false, patente: info(r.depois), estado: { ...r.estado } };
}

function desistenciaDe(c, p){                                  // (a ranqueada vencida sem o fim: desistência, como no jogoRouter)
  const r = aplica(c, p.id, { placarNosso: 0, placarDeles: 0, abandono: true, contraBots: !p.online, nivelBots: p.nivelBots }, { online: p.online, tamanho: p.tamanho });
  p.estado = 'encerrada'; p.rqDelta = r.delta;
  return r;
}

const API = {
  eu: (o) => ({ conta: contaJogo(conta(o.conta)) }),
  iniciar: (o) => {
    const c = conta(o.conta); if (!c) throw new Error('sem login');
    if (E.partidas.has(o.matchId)) throw new Error('Essa partida já foi registrada.');
    let desistencias = 0, rqV = null;
    for (const a of [...E.partidas.values()]) if (a.conta === c.id && a.estado === 'aberta' && a.ranqueada && Date.now() - a.criada > VALIDADE_MS){ const r = desistenciaDe(c, a); if (!r.duplicada) desistencias++; rqV = r; }
    const token = 'tok-' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    E.partidas.set(o.matchId, { id: o.matchId, conta: c.id, token, modo: o.modo || 'futebol', nivelBots: o.nivelBots || null, ranqueada: !!o.ranqueada, online: !!o.online,
      tamanho: [1, 2, 3, 4].includes(o.tamanho) ? o.tamanho : null, estado: 'aberta', criada: Date.now() });
    E.log.push(['iniciar', o]);
    return { matchToken: token, expiraEmSeg: 1800, desistencias, rq: desistencias ? rqV : null };
  },
  encerrar: (o) => {                                         // (o encerrarPartida, a mesma ordem das decisões)
    const c = conta(o.conta); if (!c) throw new Error('sem login');
    const p = E.partidas.get(o.matchId); if (!p || p.conta !== c.id || p.token !== o.matchToken) throw new Error('Partida não encontrada.');
    E.log.push(['encerrar', o]);
    if (p.estado === 'encerrada') return { ok: true, duplicada: true, xpConcedido: 0, motivo: 'Partida já contabilizada.', rq: null };
    if (Date.now() - p.criada > VALIDADE_MS){
      if (p.ranqueada){ const r = desistenciaDe(c, p); return { ok: true, duplicada: false, xpConcedido: 0, motivo: 'Essa partida expirou: na ranqueada, conta como desistência (' + r.delta + ' pontos).', rq: r }; }
      throw new Error('Essa partida expirou.');
    }
    p.estado = 'encerrada';
    const rq = p.ranqueada, partidaRq = ab => ({ placarNosso: o.placarNosso | 0, placarDeles: o.placarDeles | 0, abandono: ab, contraBots: !p.online, nivelBots: p.nivelBots });
    const extra = { online: p.online, tamanho: p.tamanho };
    const acao = m => acaoRanqueada({ ranqueada: rq, online: p.online, fimOnline: !!o.online, abandonada: !!o.abandonada, valida: o.valida !== false, motivoOnline: m });
    if (acao('') === 'mudou') return { ok: true, duplicada: false, xpConcedido: 0, motivo: 'A partida mudou de tipo no meio (online × contra os bots).', rq: null };
    if (o.online && !o.abandonada){
      let selo = null; try { selo = o.valida !== false && o.selo ? JSON.parse(o.selo) : null; } catch (_) {}
      const motivo = motivoResultadoOnline(selo, { valida: o.valida !== false, idPublico: c.idPublico, placarNosso: o.placarNosso | 0, placarDeles: o.placarDeles | 0, modo: p.modo,
        ranqueada: rq, tamanho: p.tamanho, agora: Date.now() });
      if (motivo) return { ok: true, duplicada: false, xpConcedido: 0, motivo, rq: null };
    }
    if (o.abandonada || o.valida === false){
      const des = acao('') === 'desistencia' ? aplica(c, p.id, partidaRq(true), extra) : null;
      return { ok: true, duplicada: false, xpConcedido: 0, motivo: o.abandonada ? (des ? 'Desistência da ranqueada: ' + des.delta + ' pontos.' : 'Partida abandonada não rende XP.') : 'O servidor da turma não validou esse resultado.', rq: des };
    }
    if ((o.duracaoSeg | 0) < XP.PARTIDA_MIN_SEG) throw new Error('Partida curta demais para ser válida.');
    const resultado = o.placarNosso > o.placarDeles ? 'vitoria' : o.placarNosso < o.placarDeles ? 'derrota' : 'empate';
    let xp = XP.PARTICIPACAO + (o.gols | 0) * XP.GOL + (o.assistencias | 0) * XP.ASSISTENCIA + (resultado === 'vitoria' ? XP.VITORIA : resultado === 'empate' ? XP.EMPATE : 0);
    xp = Math.min(xp, XP.MAX_POR_PARTIDA);
    const antes = c.nivel; c.xp += xp; c.nivel = nivelPorXp(c.xp);
    const rqRes = acao('') === 'partida' ? aplica(c, p.id, partidaRq(false), extra) : null;
    return { ok: true, duplicada: false, resultado, xpConcedido: xp, xpTotal: c.xp, nivel: c.nivel, subiuNivel: c.nivel > antes, titulo: '', itensNovos: [], conquistasNovas: [], tetoDiarioAtingido: false, rq: rqRes };
  },
  'progresso/carregar': (o) => { const c = conta(o.conta); if (!c) throw new Error('sem login'); return c.nuvem ? JSON.parse(JSON.stringify(c.nuvem)) : null; },
  'progresso/salvar': (o) => {
    const c = conta(o.conta); if (!c) throw new Error('sem login');
    const v = validaProgresso(o.dados); if (!v.ok) throw new Error(v.erro);
    if (c.nuvem && c.nuvem.versao !== (o.versaoBase | 0)) return { ok: false, conflito: true, ...JSON.parse(JSON.stringify(c.nuvem)) };
    const versao = c.nuvem ? c.nuvem.versao + 1 : 1;
    c.nuvem = { versao, dados: v.dados, bytes: v.bytes, aparelho: o.aparelho || null, salvoEm: Date.now() };
    E.log.push(['salvar', { conta: c.id, versao, aparelho: o.aparelho }]);
    return { ok: true, versao };
  },
  minha: (o) => { const c = conta(o.conta); return { ...c.rq, importado: c.importado, patente: info(c.rq.pts), posicao: null }; },
  ranking: (o) => {
    const l = [...E.contas.values()].filter(c => c.publico && c.rq.pts > 0).sort((a, b) => b.rq.pts - a.rq.pts || b.rq.melhor - a.rq.melhor);
    const lista = l.slice(0, Math.max(1, Math.min(200, o.limite | 0 || 100))).map((c, i) => ({ posicao: i + 1, idPublico: c.idPublico, nomeExibicao: c.nome, avatarEmoji: '⚽', molduraEquipada: null,
      tampa: null, pts: c.rq.pts, jogos: c.rq.jogos, vit: c.rq.vit, patente: info(c.rq.pts), selos: c.selos.slice() }));
    const eu = conta(o.conta);
    return { lista, eu: eu ? { idPublico: eu.idPublico, pts: eu.rq.pts, posicao: eu.rq.pts > 0 ? l.indexOf(eu) + 1 : null, patente: info(eu.rq.pts) } : null };
  },
  importar: (o) => {
    const c = conta(o.conta); if (!c) throw new Error('sem login');
    if (c.importado) return { importou: 0, estado: { ...c.rq, importado: true }, patente: info(c.rq.pts) };
    const novo = patenteImportada(c.rq, o.pts | 0); c.importado = true;
    if (novo){ const antes = c.rq.pts; c.rq = novo; c.eventos.push({ referencia: 'importacao', motivo: 'importacao', antes, delta: novo.pts - antes, depois: novo.pts }); }
    return { importou: novo ? novo.pts : 0, estado: { ...c.rq, importado: true }, patente: info(c.rq.pts) };
  },
  // (só para o teste)
  'teste/estado': () => ({ contas: [...E.contas.values()], partidas: [...E.partidas.values()], log: E.log.slice(-60) }),
  'teste/ajusta': (o) => {
    const c = conta(o.conta); Object.assign(c, o.campos || {});
    if (c.botsDia === 'hoje') c.botsDia = hoje();
    if (o.campos && 'xp' in o.campos) c.nivel = nivelPorXp(c.xp);
    if (o.rq) c.rq = normalizaEstado({ ...c.rq, ...o.rq });
    return { ok: true, conta: contaJogo(c) };
  },
  'teste/envelhece': (o) => { let n = 0; for (const p of E.partidas.values()) if (p.estado === 'aberta' && (o.matchId ? p.id === o.matchId : p.conta === Number(o.conta))){ p.criada -= (o.min || 31) * 60000; n++; } return { n }; },
  'teste/atraso': (o) => { E.atraso = o.atraso || {}; return { ok: true }; },
  'teste/regras': (o) => ({ r: (o.casos || []).map(k => pontuaRanqueada(k.estado, k.partida, k.ganho || 0, k.teto === undefined ? undefined : k.teto)) }),
};

const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname.startsWith('/api82/')){
    let corpo = '';
    req.on('data', d => { corpo += d; if (corpo.length > 2e6) req.destroy(); });
    req.on('end', () => {
      const rota = u.pathname.slice(7), ms = E.atraso[rota] | 0;
      setTimeout(() => {
        try {
          const fn = API[rota]; if (!fn) throw new Error('sem rota ' + u.pathname);
          const r = fn(corpo ? JSON.parse(corpo) : {});
          res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(r === undefined ? null : r));
        } catch (e) { res.writeHead(400, { 'content-type': 'application/json' }); res.end(JSON.stringify({ erro: String(e && e.message || e) })); }
      }, ms);
    });
    return;
  }
  const arq = path.join(RAIZ, decodeURIComponent(u.pathname));
  if (!arq.startsWith(RAIZ) || !fs.existsSync(arq) || fs.statSync(arq).isDirectory()){ res.writeHead(404); res.end('nao achei'); return; }
  res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(arq).pipe(res);
}).listen(PORTA, '127.0.0.1', () => console.log('plataforma falsa v82 em http://127.0.0.1:' + PORTA + '/'));
