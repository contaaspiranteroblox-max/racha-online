'use strict';
/* =====================================================================================================================
   RACHA v92 · OFICINA — O CATÁLOGO DOS MAPAS (no servidor das salas, gravado em disco)

   O que fica guardado (numa pasta: RACHA_MAPAS, --mapas ou server/dados/mapas; sem pasta, só na memória — os testes):
     · cada mapa publicado (público, não listado ou privado) com as VERSÕES antigas (as últimas MAX_VERSOES) —
       m/<id>.json, gravado de forma atômica (arquivo temporário + troca de nome) na hora de publicar;
     · a miniatura (t/<id>.txt: uma imagem pequena em data:image/…, conferida);
     · o índice (indice.json): os dados de cada mapa para o catálogo (nome, criador, código, modo, jogos, curtidas,
       favoritos, denúncias, colaboradores e permissões, moderação), as CURTIDAS, os FAVORITOS e as DENÚNCIAS de cada um.
       Gravado de forma atômica logo depois de cada mudança (junta as mudanças de 1 s numa gravação só) e na hora de desligar.
       Se o índice estragar, ele é refeito dos arquivos dos mapas (as curtidas e os favoritos vêm da cópia de segurança,
       indice.json.bak, quando ela abre).
   Tudo que chega passa pelo RachaMapa.limpa (server/partida/mapa.js) — o mesmo que o jogo usa — antes de ser guardado:
   o servidor nunca guarda nem repassa um mapa que ele mesmo não validou. Nada de código: só os dados do formato.

   Cada criador tem no máximo MAX_PUBLICOS (3) mapas PÚBLICOS — os que aparecem na comunidade, com as curtidas e os favoritos;
   os não listados (só com o código) e os privados não contam. O servidor confere ao publicar e ao trocar a visibilidade.

   Permissões: o CRIADOR pode tudo; os COLABORADORES têm editar, testar, publicar (versão nova) e duplicar, cada um
   ligado ou não; os outros jogam (público e não listado) e copiam só se o criador deixou (permiteCopiar). A EQUIPE
   (selo 'equipe', o Dono 000001 e os ids de RACHA_MODERADORES) modera: oculta, restaura, remove, marca como oficial ou
   escolha da comunidade e limpa as denúncias. Com DENUNCIAS_OCULTA pessoas diferentes denunciando, o mapa sai do
   catálogo até a equipe olhar (o criador continua vendo, com o aviso).
   ===================================================================================================================== */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const RachaMapa = require('./partida/mapa');

const MAX_VERSOES = 15;
const MAX_POR_DONO = 30;
// os mapas PÚBLICOS (na comunidade) de cada criador: no máximo 3 — os não listados e os privados não contam, a versão nova
// de um que já é público também não (a equipe do RACHA não tem esse limite)
const MAX_PUBLICOS = 3;
const ERRO_PUBLICOS = 'Você já tem ' + MAX_PUBLICOS + ' mapas públicos (o máximo por jogador). Publique este como não listado ou privado — ou deixe um dos públicos como não listado (ou apague um) para abrir a vaga.';
const MAX_TOTAL = 20000;
// o espaço em disco do catálogo inteiro (os mapas × as versões guardadas): RACHA_MAPAS_MAX_MB, padrão 512 MB
const MAX_BYTES = Math.max(16, Number(process.env.RACHA_MAPAS_MAX_MB) || 512) * 1048576;
// os mapas NOVOS de quem ainda não é de confiança (o visitante de agora há pouco: sem conta, < 24 h ou < 3 partidas), no
// servidor inteiro, por hora — quem abre mil conexões sem token não enche o disco (cada uma é "uma pessoa nova" para o resto)
const NOVOS_SEM_CONFIANCA_HORA = 120;
const POR_PAGINA = 12;
const DENUNCIAS_OCULTA = 5;
const THUMB_MAX = 40000;                              // caracteres do data:image (≈ 29 KB de imagem)
const PUBLICA_A_CADA_MS = 15000, PUBLICA_POR_DIA = 12;
const VISIBILIDADES = ['publico', 'naoListado', 'privado'];
const MOTIVOS = ['ofensivo', 'copia', 'spam', 'quebrado', 'nome', 'outro'];
const ALFA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ID_RE = /^m[a-z0-9]{8,14}$/, COD_RE = /^[A-Z0-9]{7}$/, UID_RE = /^[a-z][A-Za-z0-9_-]{1,40}$/;

const limpaTxt = (s, n) => RachaMapa.texto(typeof s === 'string' ? s : '', n);
const semAcento = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// a miniatura: só data:image/png|jpeg|webp em base64, pequena, e com o começo de uma imagem de verdade
function thumbOk(t) {
  if (typeof t !== 'string' || t.length > THUMB_MAX) return '';
  const m = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(t); if (!m) return '';
  let b; try { b = Buffer.from(m[2].slice(0, 24), 'base64'); } catch (_) { return ''; }
  const png = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47, jpg = b[0] === 0xff && b[1] === 0xd8, webp = b.slice(0, 4).toString('latin1') === 'RIFF' && b.slice(8, 12).toString('latin1') === 'WEBP';
  return (m[1] === 'png' && png) || (m[1] === 'jpeg' && jpg) || (m[1] === 'webp' && webp) ? t : '';
}

class Mapas {
  /* o = {dir (pasta | null = memória), log, agora} */
  constructor(o) {
    o = o || {};
    this.dir = o.dir ? path.resolve(o.dir) : null;
    this.log = o.log || (() => {});
    this.agora = o.agora || Date.now;
    this.d = Mapas.vazio();
    this.cache = new Map();                          // id → o arquivo do mapa (as versões), os mais usados
    this.mem = new Map();                            // (sem pasta: os arquivos ficam aqui)
    this.memThumb = new Map();
    this.ritmo = new Map();                          // uid → as publicações recentes (o limite por tempo e por dia)
    this.novosSemConfianca = [];                     // quando saíram os mapas novos de quem ainda não é de confiança (a última hora)
    this.jogosRec = new Map();                       // uid|id → quando contou a última partida (não infla os jogos)
    this.sujo = false; this.timer = null;
    this.carrega();
  }
  static vazio() { return { v: 1, mapas: {}, codigos: {}, curtidas: {}, curtidasC: {}, favoritos: {}, denuncias: {}, seq: 0 }; }

  /* ------------------------------------------------------------------ o disco */
  arq(...p) { return path.join(this.dir, ...p); }
  grava(arquivo, txt) {                               // atômico: o temporário e a troca de nome (nunca fica pela metade)
    fs.mkdirSync(path.dirname(arquivo), { recursive: true });
    const tmp = arquivo + '.' + process.pid + '.' + crypto.randomBytes(3).toString('hex') + '.tmp';
    fs.writeFileSync(tmp, txt);
    fs.renameSync(tmp, arquivo);
  }
  carrega() {
    if (!this.dir) return;
    const ler = a => { try { return JSON.parse(fs.readFileSync(a, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') this.log('mapas: não abriu ' + a + ' (' + e.message + ')'); return null; } };
    let o = ler(this.arq('indice.json'));
    if (o && o.v === 1 && o.mapas && typeof o.mapas === 'object') { this.d = Object.assign(Mapas.vazio(), o); this.confere(ler); return; }
    if (fs.existsSync(this.arq('indice.json'))) {     // estragado: guarda a cópia e refaz
      try { fs.copyFileSync(this.arq('indice.json'), this.arq('indice.json.estragado-' + Date.now())); } catch (_) {}
    }
    const bak = ler(this.arq('indice.json.bak'));
    if (bak && bak.v === 1 && bak.mapas) this.d = Object.assign(Mapas.vazio(), bak);
    let n = 0;                                       // os arquivos dos mapas valem mais que a cópia: o índice é refeito deles
    try {
      for (const f of fs.readdirSync(this.arq('m'))) {
        if (!/^m[a-z0-9]+\.json$/.test(f)) continue;
        const a = ler(this.arq('m', f)); if (!a || !a.meta || !ID_RE.test(a.meta.id)) continue;
        const antes = this.d.mapas[a.meta.id];
        this.d.mapas[a.meta.id] = Object.assign({}, a.meta, antes ? { jogos: antes.jogos, curtidas: antes.curtidas, favoritos: antes.favoritos, denuncias: antes.denuncias, estado: antes.estado, oficial: antes.oficial, destaque: antes.destaque } : {});
        this.d.codigos[a.meta.codigo] = a.meta.id; n++;
      }
    } catch (e) { if (e.code !== 'ENOENT') this.log('mapas: não deu para ler a pasta dos mapas: ' + e.message); }
    if (n || bak) { this.log('mapas: o índice foi refeito (' + n + ' mapas)'); this.marca(); }
  }
  // o índice abriu: confere com os arquivos dos mapas gravados DEPOIS dele (o servidor caiu no segundo em que o índice espera
  // para gravar: o mapa novo ou a versão nova está no arquivo e não no índice). Só abre os arquivos mais novos que o índice.
  confere(ler) {
    let tIdx = 0; try { tIdx = fs.statSync(this.arq('indice.json')).mtimeMs; } catch (_) { return; }
    let nomes = []; try { nomes = fs.readdirSync(this.arq('m')); } catch (e) { if (e.code !== 'ENOENT') this.log('mapas: não deu para ler a pasta dos mapas: ' + e.message); return; }
    let n = 0;
    for (const f of nomes) {
      if (!/^m[a-z0-9]+\.json$/.test(f)) continue;
      const id = f.slice(0, -5), antes = this.d.mapas[id];
      let st; try { st = fs.statSync(this.arq('m', f)); } catch (_) { continue; }
      if (antes && st.mtimeMs <= tIdx) continue;
      const a = ler(this.arq('m', f)); if (!a || !a.meta || a.meta.id !== id || !ID_RE.test(id) || !COD_RE.test(String(a.meta.codigo || ''))) continue;
      if (antes && (a.meta.salvo || 0) <= (antes.salvo || 0) && (a.meta.versao | 0) <= (antes.versao | 0)) continue;
      // (os contadores e as listas — curtidas, favoritos, denúncias, jogos — ficam os do índice; o resto vem do arquivo)
      this.d.mapas[id] = Object.assign({}, antes || {}, a.meta, antes ? { jogos: antes.jogos, curtidas: antes.curtidas, curtidasC: antes.curtidasC, favoritos: antes.favoritos, denuncias: antes.denuncias } : {});
      this.d.codigos[a.meta.codigo] = id; n++;
    }
    if (n) { this.log('mapas: ' + n + ' mapa(s) mais novo(s) que o índice voltaram para ele'); this.marca(); }
  }
  marca() { this.sujo = true; if (!this.timer && this.dir) { this.timer = setTimeout(() => this.salva(), 1000); if (this.timer.unref) this.timer.unref(); } }
  salva() {
    this.timer = null;
    if (!this.sujo || !this.dir) return true;
    try {
      const txt = JSON.stringify(this.d);
      this.grava(this.arq('indice.json.bak'), txt);     // (a cópia de segurança primeiro: se o índice estragar, ela tem o mesmo)
      this.grava(this.arq('indice.json'), txt);
      this.sujo = false; return true;
    } catch (e) {
      this.log('mapas: não deu para gravar o índice: ' + e.message);
      if (!this.timer) { this.timer = setTimeout(() => this.salva(), 5000); if (this.timer.unref) this.timer.unref(); }
      return false;
    }
  }
  salvaJa() { if (this.timer) { clearTimeout(this.timer); this.timer = null; } return this.salva(); }
  arquivoDe(id) {                                     // as versões do mapa (do cache, do disco ou da memória)
    if (this.cache.has(id)) { const a = this.cache.get(id); this.cache.delete(id); this.cache.set(id, a); return a; }
    let a = null;
    if (!this.dir) a = this.mem.get(id) || null;
    else { try { a = JSON.parse(fs.readFileSync(this.arq('m', id + '.json'), 'utf8')); } catch (_) { a = null; } }
    if (a) { this.cache.set(id, a); if (this.cache.size > 150) this.cache.delete(this.cache.keys().next().value); }
    return a;
  }
  gravaArquivo(id, a) {
    if (a && a.meta) a.meta.salvo = this.agora();      // (quando o arquivo mudou: o índice confere por isto ao abrir)
    const txt = JSON.stringify(a);
    if (!this.dir) this.mem.set(id, a);
    else this.grava(this.arq('m', id + '.json'), txt);
    if (a && a.meta) a.meta.bytes = txt.length;        // (o tamanho no disco: o teto do catálogo inteiro, MAX_BYTES)
    this.cache.set(id, a);
  }
  bytesTotal() { let s = 0; for (const id in this.d.mapas) { const m = this.d.mapas[id]; s += m.bytes || m.tamanho || 0; } return s; }
  thumbDe(id) {
    if (!this.dir) return this.memThumb.get(id) || '';
    try { return fs.readFileSync(this.arq('t', id + '.txt'), 'utf8'); } catch (_) { return ''; }
  }
  gravaThumb(id, t) {
    if (!this.dir) { if (t) this.memThumb.set(id, t); else this.memThumb.delete(id); return; }
    if (t) this.grava(this.arq('t', id + '.txt'), t); else { try { fs.unlinkSync(this.arq('t', id + '.txt')); } catch (_) {} }
  }

  /* ------------------------------------------------------------------ quem pode o quê */
  papel(meta, quem) {
    const eu = quem && quem.id, dono = !!eu && meta.dono === eu, c = eu && meta.colab ? meta.colab[eu] : null;
    const staff = !!(quem && quem.staff);
    return {
      dono, staff, colab: !!c,
      ver: meta.estado !== 'removido' && (dono || !!c || staff || (meta.estado === 'ok' && meta.visibilidade !== 'privado')),
      editar: dono || !!(c && c.editar), publicar: dono || !!(c && c.publicar), testar: dono || !!(c && c.testar) || (meta.estado === 'ok' && meta.visibilidade !== 'privado'),
      duplicar: dono || !!(c && c.duplicar) || (meta.permiteCopiar && meta.estado === 'ok' && meta.visibilidade !== 'privado'),
      jogar: meta.estado === 'ok' && (meta.visibilidade !== 'privado' || dono || !!c),
    };
  }
  publicaMeta(meta, quem, comThumb) {                 // o que vai para o aparelho (sem quem curtiu nem quem denunciou)
    const p = this.papel(meta, quem), eu = quem && quem.id;
    const o = { id: meta.id, codigo: meta.codigo, nome: meta.nome, descricao: meta.descricao, autor: meta.donoNome, categoria: meta.categoria, modo: meta.modo,
      equipes: meta.equipes, porTime: meta.porTime, visibilidade: meta.visibilidade, versao: meta.versao, criado: meta.criado, editado: meta.editado, publicado: meta.publicado,
      jogos: meta.jogos | 0, curtidas: meta.curtidas | 0, favoritos: meta.favoritos | 0, oficial: !!meta.oficial, destaque: !!meta.destaque,
      permiteCopiar: !!meta.permiteCopiar, estado: meta.estado, tags: meta.tags || [], origem: meta.origem || '',
      meu: { dono: p.dono, colab: p.colab, editar: p.editar, publicar: p.publicar, testar: p.testar, duplicar: p.duplicar, staff: p.staff,
        curti: !!(eu && (this.d.curtidas[meta.id] || []).includes(eu)), favorito: !!(eu && (this.d.favoritos[eu] || []).includes(meta.id)) } };
    if (p.dono || p.staff) { o.denuncias = meta.denuncias | 0; o.colaboradores = Object.entries(meta.colab || {}).map(([uid, c]) => ({ uid, pub: c.pub || '', nome: c.nome, editar: !!c.editar, testar: !!c.testar, publicar: !!c.publicar, duplicar: !!c.duplicar })); }
    if (comThumb) o.thumb = this.thumbDe(meta.id);
    return o;
  }
  porRef(ref) {
    if (!ref || typeof ref !== 'object') return null;
    if (typeof ref.id === 'string' && ID_RE.test(ref.id) && this.d.mapas[ref.id]) return this.d.mapas[ref.id];
    const c = typeof ref.codigo === 'string' ? ref.codigo.toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
    if (COD_RE.test(c) && this.d.codigos[c]) return this.d.mapas[this.d.codigos[c]] || null;
    return null;
  }
  // quantos mapas públicos o criador tem (sem contar o "exceto": o que está mudando agora)
  publicosDe(uid, exceto) { let n = 0; for (const m of Object.values(this.d.mapas)) if (m.dono === uid && m.id !== exceto && m.estado !== 'removido' && m.visibilidade === 'publico') n++; return n; }
  limitePublicos(quem) { return { publicos: quem && quem.id ? this.publicosDe(quem.id) : 0, maxPublicos: MAX_PUBLICOS, semLimite: !!(quem && quem.staff) }; }
  novoCodigo() { let s; do { s = ''; const b = crypto.randomBytes(7); for (let i = 0; i < 7; i++) s += ALFA[b[i] % ALFA.length]; } while (this.d.codigos[s]); return s; }
  novoIdMapa() { let s; do { s = 'm' + crypto.randomBytes(8).toString('hex').slice(0, 11); } while (this.d.mapas[s]); return s; }

  /* ------------------------------------------------------------------ publicar (novo ou versão nova) */
  // quem = {id, nome, staff} · o = {id?, mapa, nome?, descricao?, categoria?, visibilidade?, thumb?, permiteCopiar?, nota?, origem?}
  publicar(quem, o) {
    if (!quem || !UID_RE.test(String(quem.id || ''))) return { ok: false, erro: 'Entre no online para publicar.' };
    o = o && typeof o === 'object' ? o : {};
    const agora = this.agora();
    const r = this.ritmo.get(quem.id) || []; while (r.length && agora - r[0] > 864e5) r.shift();
    if (!quem.staff && r.length && agora - r[r.length - 1] < PUBLICA_A_CADA_MS) return { ok: false, erro: 'Calma: espere uns segundos para publicar de novo.' };
    if (!quem.staff && r.length >= PUBLICA_POR_DIA) return { ok: false, erro: 'Você já publicou ' + PUBLICA_POR_DIA + ' vezes hoje. Volte amanhã.' };
    const lv = RachaMapa.limpa(o.mapa);
    if (!lv.ok) return { ok: false, erro: 'O mapa tem problemas: ' + (lv.erros || []).slice(0, 3).join(' · '), erros: lv.erros };
    const mapa = lv.mapa;
    let meta = o.id ? this.porRef({ id: o.id }) : null;
    if (o.id && !meta) return { ok: false, erro: 'Esse mapa não existe mais no servidor.' };
    if (meta) {
      const p = this.papel(meta, quem);
      if (!p.publicar) return { ok: false, erro: 'Você não tem permissão para publicar este mapa.' };
      if (meta.estado === 'removido') return { ok: false, erro: 'Este mapa foi removido pela moderação.' };
    } else {
      const meus = Object.values(this.d.mapas).filter(x => x.dono === quem.id && x.estado !== 'removido').length;
      if (!quem.staff && meus >= MAX_POR_DONO) return { ok: false, erro: 'Você já tem ' + MAX_POR_DONO + ' mapas no servidor. Apague algum para publicar outro.' };
      if (Object.keys(this.d.mapas).length >= MAX_TOTAL) return { ok: false, erro: 'O catálogo está cheio agora. Tente mais tarde.' };
      if (!quem.staff && !quem.confiavel) {           // (o teto de mapas novos de quem acabou de chegar, no servidor inteiro)
        const L = this.novosSemConfianca; while (L.length && agora - L[0] > 36e5) L.shift();
        if (L.length >= NOVOS_SEM_CONFIANCA_HORA) return { ok: false, erro: 'Muitos mapas novos agora. Tente daqui a pouco (ou entre com a sua conta).' };
      }
      if (o.origem) {                                 // (duplicado de outro: só se o outro deixa copiar)
        const orig = this.porRef({ id: o.origem });
        if (orig && !this.papel(orig, quem).duplicar) return { ok: false, erro: 'O criador do mapa original não deixa copiar.' };
      }
    }
    if (this.bytesTotal() + JSON.stringify(mapa).length > MAX_BYTES) {
      this.log('mapas: o espaço do catálogo acabou (' + Math.round(MAX_BYTES / 1048576) + ' MB: RACHA_MAPAS_MAX_MB)');
      return { ok: false, erro: 'O espaço dos mapas no servidor acabou. Avise a equipe do RACHA.' };
    }
    // (o nome, a descrição, a categoria e a visibilidade são do criador: o colaborador que publica uma versão nova não mexe neles)
    const criador = !meta || quem.staff || this.papel(meta, quem).dono;
    const nome = criador ? limpaTxt(o.nome != null ? o.nome : mapa.nome, RachaMapa.LIM.nome) || 'Mapa sem nome' : meta.nome;
    const descricao = criador ? limpaTxt(o.descricao != null ? o.descricao : mapa.descricao, RachaMapa.LIM.descricao) : meta.descricao;
    const categoria = criador ? (RachaMapa.CATEGORIAS.includes(o.categoria) ? o.categoria : mapa.categoria) : meta.categoria;
    const visibilidade = criador && VISIBILIDADES.includes(o.visibilidade) ? o.visibilidade : (meta ? meta.visibilidade : 'publico');
    // (no máximo MAX_PUBLICOS públicos por criador: conta quando o mapa VIRA público — novo, ou um não listado/privado que passa a público)
    if (visibilidade === 'publico' && (!meta || meta.visibilidade !== 'publico') && !quem.staff && this.publicosDe(meta ? meta.dono : quem.id, meta && meta.id) >= MAX_PUBLICOS)
      return Object.assign({ ok: false, erro: ERRO_PUBLICOS, codigo: 'publicos' }, this.limitePublicos(quem));
    const novo = !meta;
    if (novo) {
      const id = this.novoIdMapa(), codigo = this.novoCodigo();
      meta = { id, codigo, dono: quem.id, donoNome: limpaTxt(quem.nome, 24) || 'Jogador', criado: agora, publicado: agora, versao: 0, jogos: 0, curtidas: 0, favoritos: 0, denuncias: 0,
        estado: 'ok', oficial: false, destaque: false, colab: {}, origem: o.origem && this.porRef({ id: o.origem }) ? o.origem : '', permiteCopiar: true };
      this.d.mapas[id] = meta; this.d.codigos[codigo] = id;
    }
    const arq = (!novo && this.arquivoDe(meta.id)) || { versoes: [] };
    meta.versao = (meta.versao | 0) + 1;
    Object.assign(meta, { nome, descricao, categoria, visibilidade, editado: agora, modo: mapa.partida.modo, equipes: mapa.partida.equipes, porTime: mapa.partida.porTime,
      tags: mapa.tags, tamanho: JSON.stringify(mapa).length });
    if (typeof o.permiteCopiar === 'boolean' && (novo || this.papel(meta, quem).dono)) meta.permiteCopiar = o.permiteCopiar;
    mapa.id = meta.id; mapa.codigo = meta.codigo; mapa.nome = nome; mapa.descricao = descricao; mapa.categoria = categoria; mapa.versao = meta.versao;
    mapa.autor = meta.donoNome; mapa.editado = agora; if (!mapa.criado) mapa.criado = meta.criado;
    arq.versoes.push({ versao: meta.versao, t: agora, por: quem.id, porNome: limpaTxt(quem.nome, 24), nota: limpaTxt(o.nota, 80), mapa });
    while (arq.versoes.length > MAX_VERSOES) arq.versoes.shift();
    arq.meta = meta;
    try {
      this.gravaArquivo(meta.id, arq);
      if (o.thumb !== undefined) { const t = thumbOk(o.thumb); if (t || o.thumb === '') this.gravaThumb(meta.id, t); }
    } catch (e) {
      this.log('mapas: não deu para gravar o mapa ' + meta.id + ': ' + e.message);
      meta.versao--; if (novo) { delete this.d.mapas[meta.id]; delete this.d.codigos[meta.codigo]; }
      return { ok: false, erro: 'O servidor não conseguiu guardar o mapa agora. Tente de novo.' };
    }
    r.push(agora); this.ritmo.set(quem.id, r);
    if (novo && !quem.staff && !quem.confiavel) this.novosSemConfianca.push(agora);
    this.marca();
    this.log('mapas: ' + (novo ? 'novo mapa ' : 'versão ' + meta.versao + ' de ') + meta.codigo + ' «' + nome + '» por ' + quem.id);
    return Object.assign({ ok: true, meta: this.publicaMeta(meta, quem, false), avisos: lv.avisos }, this.limitePublicos(quem));
  }

  /* ------------------------------------------------------------------ abrir, as versões, a lista */
  abrir(quem, ref) {
    const meta = this.porRef(ref); if (!meta) return { ok: false, erro: 'Mapa não encontrado. Confira o código.' };
    const p = this.papel(meta, quem);
    if (!p.ver) return { ok: false, erro: meta.estado === 'removido' ? 'Este mapa foi removido.' : meta.estado === 'oculto' ? 'Este mapa está em análise pela moderação.' : 'Este mapa é privado.' };
    const arq = this.arquivoDe(meta.id); if (!arq || !arq.versoes.length) return { ok: false, erro: 'O arquivo do mapa sumiu do servidor.' };
    let v = arq.versoes[arq.versoes.length - 1];
    if (ref && Number.isInteger(ref.versao) && ref.versao !== v.versao) {
      if (!p.editar) return { ok: false, erro: 'Só quem edita o mapa abre as versões antigas.' };
      v = arq.versoes.find(x => x.versao === ref.versao); if (!v) return { ok: false, erro: 'Essa versão não está mais guardada.' };
    }
    return { ok: true, meta: this.publicaMeta(meta, quem, true), mapa: v.mapa, versao: v.versao };
  }
  versoes(quem, ref) {
    const meta = this.porRef(ref); if (!meta) return { ok: false, erro: 'Mapa não encontrado.' };
    if (!this.papel(meta, quem).editar) return { ok: false, erro: 'Só quem edita o mapa vê as versões.' };
    const arq = this.arquivoDe(meta.id) || { versoes: [] };
    return { ok: true, id: meta.id, versoes: arq.versoes.map(v => ({ versao: v.versao, t: v.t, por: v.porNome || '', nota: v.nota || '', objetos: v.mapa.objetos.length })).reverse() };
  }
  // q = {aba, categoria?, busca?, pagina?}
  lista(quem, q) {
    q = q && typeof q === 'object' ? q : {};
    const aba = ['populares', 'curtidos', 'recentes', 'oficiais', 'escolha', 'favoritos', 'meus', 'compartilhados', 'categoria', 'busca', 'competitivos', 'criativos', 'treino', 'minigames'].includes(q.aba) ? q.aba : 'populares';
    const eu = quem && quem.id;
    let L = Object.values(this.d.mapas);
    const catalogo = m => m.estado === 'ok' && m.visibilidade === 'publico';
    const porCat = { competitivos: 'competitivo', criativos: 'criativo', treino: 'treinamento', minigames: 'minigame' };
    if (aba === 'meus') L = L.filter(m => m.dono === eu && m.estado !== 'removido');
    else if (aba === 'compartilhados') L = L.filter(m => eu && m.colab && m.colab[eu] && m.estado !== 'removido');
    else if (aba === 'favoritos') { const f = new Set(eu ? this.d.favoritos[eu] || [] : []); L = L.filter(m => f.has(m.id) && this.papel(m, quem).ver); }
    else if (aba === 'busca') {
      const txt = semAcento(limpaTxt(q.busca, 40)).trim(), cod = String(q.busca || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (COD_RE.test(cod) && this.d.codigos[cod]) { const m = this.d.mapas[this.d.codigos[cod]]; L = m && this.papel(m, quem).ver ? [m] : []; }
      else L = txt.length >= 2 ? L.filter(m => catalogo(m) && (semAcento(m.nome).includes(txt) || semAcento(m.donoNome).includes(txt) || (m.tags || []).some(t => semAcento(t).includes(txt)))) : [];
    } else {
      L = L.filter(catalogo);
      if (aba === 'oficiais') L = L.filter(m => m.oficial);
      else if (aba === 'escolha') L = L.filter(m => m.destaque);
      else if (aba === 'categoria') L = L.filter(m => m.categoria === q.categoria);
      else if (porCat[aba]) L = L.filter(m => m.categoria === porCat[aba]);
    }
    const ordem = {
      // (as curtidas de confiança primeiro: as de quem tem conta ou já joga há um tempo — ver curtir)
      populares: (a, b) => (b.jogos | 0) - (a.jogos | 0) || (b.curtidasC | 0) - (a.curtidasC | 0) || (b.curtidas | 0) - (a.curtidas | 0) || b.publicado - a.publicado,
      curtidos: (a, b) => (b.curtidasC | 0) - (a.curtidasC | 0) || (b.curtidas | 0) - (a.curtidas | 0) || (b.jogos | 0) - (a.jogos | 0) || b.publicado - a.publicado,
      recentes: (a, b) => b.publicado - a.publicado,
    };
    L.sort(aba === 'curtidos' ? ordem.curtidos : aba === 'recentes' ? ordem.recentes : ['meus', 'compartilhados', 'favoritos'].includes(aba) ? (a, b) => b.editado - a.editado : ordem.populares);
    const pagina = Math.max(0, Math.min(500, q.pagina | 0)), total = L.length;
    const o = { ok: true, aba, pagina, total, porPagina: POR_PAGINA, itens: L.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA).map(m => this.publicaMeta(m, quem, true)) };
    return aba === 'meus' ? Object.assign(o, this.limitePublicos(quem)) : o;   // (nos meus: quantos públicos eu tenho, de MAX_PUBLICOS)
  }

  /* ------------------------------------------------------------------ curtir, favoritar, denunciar, jogos */
  curtir(quem, ref, on) {
    const meta = this.porRef(ref); if (!meta || !quem || !quem.id) return { ok: false, erro: 'Mapa não encontrado.' };
    if (!this.papel(meta, quem).ver) return { ok: false, erro: 'Mapa não encontrado.' };
    const l = this.d.curtidas[meta.id] || (this.d.curtidas[meta.id] = []), i = l.indexOf(quem.id);
    if (on && i < 0) l.push(quem.id); else if (!on && i >= 0) l.splice(i, 1);
    if (!l.length) delete this.d.curtidas[meta.id];
    // (as curtidas de CONFIANÇA — de quem tem conta, é da equipe ou já joga aqui há 24 h e 3 partidas — vão também numa lista
    //  à parte: a ordem de "Mais curtidos" vai por elas primeiro, e quem abre mil conexões sem token não sobe o próprio mapa)
    const lc = this.d.curtidasC[meta.id] || (this.d.curtidasC[meta.id] = []), j = lc.indexOf(quem.id);
    if (on && quem.confiavel && j < 0) lc.push(quem.id); else if (!on && j >= 0) lc.splice(j, 1);
    if (!lc.length) delete this.d.curtidasC[meta.id];
    meta.curtidas = l.length; meta.curtidasC = lc.length; this.marca();
    return { ok: true, curtidas: meta.curtidas, curti: !!on };
  }
  favoritar(quem, ref, on) {
    const meta = this.porRef(ref); if (!meta || !quem || !quem.id) return { ok: false, erro: 'Mapa não encontrado.' };
    if (!this.papel(meta, quem).ver) return { ok: false, erro: 'Mapa não encontrado.' };
    const l = this.d.favoritos[quem.id] || (this.d.favoritos[quem.id] = []), i = l.indexOf(meta.id), antes = i >= 0;
    if (on && !antes) { if (l.length >= 200) return { ok: false, erro: 'Você já tem 200 favoritos.' }; l.push(meta.id); }
    else if (!on && antes) l.splice(i, 1);
    if (!l.length) delete this.d.favoritos[quem.id];
    if (on !== antes) meta.favoritos = Math.max(0, (meta.favoritos | 0) + (on ? 1 : -1));
    this.marca();
    return { ok: true, favoritos: meta.favoritos, favorito: !!on };
  }
  // devolve {ok, nova, oculto, meta} — quem chama manda também para a plataforma (RACHA CONTROL), quando ela está montada
  denunciar(quem, ref, motivo, texto) {
    const meta = this.porRef(ref); if (!meta || !quem || !quem.id) return { ok: false, erro: 'Mapa não encontrado.' };
    if (meta.dono === quem.id) return { ok: false, erro: 'Esse mapa é seu.' };
    if (!this.papel(meta, quem).ver) return { ok: false, erro: 'Mapa não encontrado.' };
    const l = this.d.denuncias[meta.id] || (this.d.denuncias[meta.id] = []);
    if (l.some(x => x.de === quem.id)) return { ok: true, nova: false, oculto: meta.estado === 'oculto' };
    if (l.length >= 100) l.shift();
    l.push({ de: quem.id, nome: limpaTxt(quem.nome, 24), motivo: MOTIVOS.includes(motivo) ? motivo : 'outro', texto: limpaTxt(texto, 200), t: this.agora(), versao: meta.versao, conf: !!(quem.confiavel || quem.staff) });
    meta.denuncias = l.length;
    let oculto = false;
    // (o mapa só sai do catálogo sozinho com DENUNCIAS_OCULTA pessoas de CONFIANÇA diferentes — conta, equipe ou quem já joga aqui
    //  há 24 h e 3 partidas; as denúncias de quem acabou de chegar vão para a fila da moderação, mas não tiram o mapa sozinhas)
    if (meta.estado === 'ok' && !meta.oficial && new Set(l.filter(x => x.conf).map(x => x.de)).size >= DENUNCIAS_OCULTA) { meta.estado = 'oculto'; meta.ocultoPor = 'denuncias'; oculto = true; this.log('mapas: ' + meta.codigo + ' saiu do catálogo (' + l.length + ' denúncias)'); }
    this.marca();
    return { ok: true, nova: true, oculto, meta };
  }
  contaJogo(id, uid) {                                // uma partida que terminou num mapa publicado (cada pessoa conta 1 a cada 10 min)
    const meta = this.d.mapas[id]; if (!meta) return false;
    const k = (uid || '?') + '|' + id, t = this.agora();
    if (uid && t - (this.jogosRec.get(k) || 0) < 600000) return false;
    this.jogosRec.set(k, t); if (this.jogosRec.size > 50000) this.jogosRec.clear();
    meta.jogos = (meta.jogos | 0) + 1; this.marca();
    return true;
  }

  /* ------------------------------------------------------------------ o criador: configurar, colaboradores, apagar */
  config(quem, ref, c) {
    const meta = this.porRef(ref); if (!meta) return { ok: false, erro: 'Mapa não encontrado.' };
    const p = this.papel(meta, quem); if (!p.dono && !p.staff) return { ok: false, erro: 'Só o criador muda isso.' };
    c = c && typeof c === 'object' ? c : {};
    if (c.visibilidade === 'publico' && meta.visibilidade !== 'publico' && !quem.staff && this.publicosDe(meta.dono, meta.id) >= MAX_PUBLICOS)
      return Object.assign({ ok: false, erro: ERRO_PUBLICOS, codigo: 'publicos' }, this.limitePublicos(quem));   // (nada muda: nem o nome)
    if (typeof c.nome === 'string' && limpaTxt(c.nome, RachaMapa.LIM.nome)) meta.nome = limpaTxt(c.nome, RachaMapa.LIM.nome);
    if (typeof c.descricao === 'string') meta.descricao = limpaTxt(c.descricao, RachaMapa.LIM.descricao);
    if (VISIBILIDADES.includes(c.visibilidade)) meta.visibilidade = c.visibilidade;
    if (RachaMapa.CATEGORIAS.includes(c.categoria)) meta.categoria = c.categoria;
    if (typeof c.permiteCopiar === 'boolean') meta.permiteCopiar = c.permiteCopiar;
    if (c.thumb !== undefined) { const t = thumbOk(c.thumb); if (t || c.thumb === '') this.gravaThumb(meta.id, t); }
    meta.editado = this.agora();
    const arq = this.arquivoDe(meta.id); if (arq) { arq.meta = meta; try { this.gravaArquivo(meta.id, arq); } catch (e) { this.log('mapas: ' + e.message); } }
    this.marca();
    return Object.assign({ ok: true, meta: this.publicaMeta(meta, quem, false) }, this.limitePublicos(quem));
  }
  // alvo = {uid, nome, pub} (o servidor das salas acha a pessoa pelo ID público) · perms = {editar, testar, publicar, duplicar} | null (tira)
  colaborador(quem, ref, alvo, perms) {
    const meta = this.porRef(ref); if (!meta) return { ok: false, erro: 'Mapa não encontrado.' };
    if (!this.papel(meta, quem).dono) return { ok: false, erro: 'Só o criador escolhe os colaboradores.' };
    if (!alvo || !UID_RE.test(String(alvo.uid || ''))) return { ok: false, erro: 'Jogador não encontrado. Confira o ID.' };
    if (alvo.uid === meta.dono) return { ok: false, erro: 'Você já é o criador.' };
    meta.colab = meta.colab || {};
    if (!perms) delete meta.colab[alvo.uid];
    else {
      if (!meta.colab[alvo.uid] && Object.keys(meta.colab).length >= 10) return { ok: false, erro: 'No máximo 10 colaboradores.' };
      meta.colab[alvo.uid] = { nome: limpaTxt(alvo.nome, 24) || 'Jogador', pub: String(alvo.pub || '').replace(/\D/g, '').slice(0, 9), editar: !!perms.editar, testar: perms.testar !== false, publicar: !!perms.publicar, duplicar: !!perms.duplicar };
    }
    const arq = this.arquivoDe(meta.id); if (arq) { arq.meta = meta; try { this.gravaArquivo(meta.id, arq); } catch (e) { this.log('mapas: ' + e.message); } }
    this.marca();
    return { ok: true, meta: this.publicaMeta(meta, quem, false) };
  }
  apagar(quem, ref) {
    const meta = this.porRef(ref); if (!meta) return { ok: false, erro: 'Mapa não encontrado.' };
    const p = this.papel(meta, quem); if (!p.dono && !p.staff) return { ok: false, erro: 'Só o criador apaga o mapa.' };
    delete this.d.mapas[meta.id]; delete this.d.codigos[meta.codigo]; delete this.d.curtidas[meta.id]; delete this.d.curtidasC[meta.id]; delete this.d.denuncias[meta.id];
    for (const uid of Object.keys(this.d.favoritos)) { const l = this.d.favoritos[uid], i = l.indexOf(meta.id); if (i >= 0) { l.splice(i, 1); if (!l.length) delete this.d.favoritos[uid]; } }
    this.cache.delete(meta.id); this.mem.delete(meta.id); this.memThumb.delete(meta.id);
    if (this.dir) { for (const f of [this.arq('m', meta.id + '.json'), this.arq('t', meta.id + '.txt')]) { try { fs.unlinkSync(f); } catch (_) {} } }
    this.marca();
    this.log('mapas: ' + meta.codigo + ' apagado por ' + (quem && quem.id));
    return Object.assign({ ok: true, id: meta.id }, this.limitePublicos(quem));
  }

  /* ------------------------------------------------------------------ a moderação (a equipe) */
  moderar(quem, ref, acao) {
    if (!quem || !quem.staff) return { ok: false, erro: 'Só a equipe do RACHA modera os mapas.' };
    const meta = this.porRef(ref); if (!meta) return { ok: false, erro: 'Mapa não encontrado.' };
    switch (acao) {
      case 'ocultar': meta.estado = 'oculto'; meta.ocultoPor = 'equipe'; break;
      case 'restaurar': meta.estado = 'ok'; meta.ocultoPor = ''; break;
      case 'remover': meta.estado = 'removido'; break;
      case 'oficial': meta.oficial = !meta.oficial; break;
      case 'destaque': meta.destaque = !meta.destaque; break;
      case 'limpar': delete this.d.denuncias[meta.id]; meta.denuncias = 0; if (meta.estado === 'oculto' && meta.ocultoPor === 'denuncias') meta.estado = 'ok'; break;
      default: return { ok: false, erro: 'Ação desconhecida.' };
    }
    // (a decisão da equipe vai também para o arquivo do mapa: se o índice e a cópia se perderem, o mapa oculto não volta)
    const arq = this.arquivoDe(meta.id); if (arq) { arq.meta = meta; try { this.gravaArquivo(meta.id, arq); } catch (e) { this.log('mapas: ' + e.message); } }
    this.marca();
    this.log('mapas: moderação ' + acao + ' em ' + meta.codigo + ' por ' + quem.id);
    return { ok: true, meta: this.publicaMeta(meta, quem, false) };
  }
  filaModeracao(quem) {
    if (!quem || !quem.staff) return { ok: false, erro: 'Só a equipe do RACHA vê as denúncias.' };
    const L = Object.values(this.d.mapas).filter(m => (m.denuncias | 0) > 0 || m.estado === 'oculto').sort((a, b) => (b.denuncias | 0) - (a.denuncias | 0)).slice(0, 50);
    return { ok: true, itens: L.map(m => Object.assign(this.publicaMeta(m, quem, true), { lista: (this.d.denuncias[m.id] || []).slice(-10).map(x => ({ nome: x.nome, motivo: x.motivo, texto: x.texto, t: x.t })) })) };
  }

  /* ------------------------------------------------------------------ a sala: o mapa que ela vai jogar */
  paraSala(quem, ref) {
    const meta = this.porRef(ref); if (!meta) return { ok: false, erro: 'Mapa não encontrado. Confira o código.' };
    const p = this.papel(meta, quem);
    if (!p.jogar && !(p.testar && meta.estado !== 'removido')) return { ok: false, erro: meta.estado !== 'ok' ? 'Este mapa não está disponível agora.' : 'Este mapa é privado.' };
    const arq = this.arquivoDe(meta.id); if (!arq || !arq.versoes.length) return { ok: false, erro: 'O arquivo do mapa sumiu do servidor.' };
    const v = arq.versoes[arq.versoes.length - 1];
    return { ok: true, meta, mapa: v.mapa, versao: v.versao, privado: meta.visibilidade === 'privado' || meta.estado !== 'ok' };
  }
  resumo() { return { mapas: Object.keys(this.d.mapas).length, pasta: this.dir || 'memória' }; }
  fecha() { this.salvaJa(); }
}

module.exports = { Mapas, thumbOk, MOTIVOS, VISIBILIDADES, MAX_VERSOES, MAX_POR_DONO, MAX_PUBLICOS, DENUNCIAS_OCULTA, POR_PAGINA, COD_RE, ID_RE };
