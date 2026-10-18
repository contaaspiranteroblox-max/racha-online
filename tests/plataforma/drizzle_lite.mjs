// RACHA · v88 — um "drizzle" pequeno em cima do SQLite que vem no Node (node:sqlite), SÓ PARA OS TESTES.
// A plataforma de verdade (app/api) usa o drizzle-orm com o MySQL; aqui não há npm nem MySQL. Com este arquivo no lugar
// de 'drizzle-orm', 'drizzle-orm/mysql-core' e 'drizzle-orm/mysql2' (o tests/plataforma/compila.cjs troca na hora de
// juntar), o código de verdade dos routers (os mesmos .ts que vão para a produção) roda contra um banco SQLite:
//   · o schema de verdade (app/db/schema.ts) vira as tabelas (CREATE TABLE … com os índices únicos);
//   · eq/and/or/…/sql montam SQL de verdade; select/insert/update/delete/query.X.findFirst/findMany/execute/transaction
//     fazem o que o drizzle faz com o mysql2 (o mesmo formato de resposta: [ResultSetHeader] e [linhas, campos]);
//   · as diferenças de dialeto que o código usa são traduzidas (NOW(), UTC_DATE(), CURDATE(), FOR UPDATE,
//     LAST_INSERT_ID(x), ON DUPLICATE KEY UPDATE) e a chave repetida vira o erro do MySQL (ER_DUP_ENTRY, 1062).
// O que NÃO é igual ao MySQL: os tipos (datas guardadas em milissegundos, booleanos 0/1, json em texto), o LIKE (sem
// acento: só maiúscula/minúscula), as travas de linha (aqui uma transação por vez) e as mensagens de erro (só as que o
// código confere). Por isso os testes dizem "plataforma de teste (SQLite)" — o MySQL de verdade só roda na produção.
import { DatabaseSync } from 'node:sqlite';

const INFO = Symbol.for('racha.drizzleLite.tabela');
const ehTabela = (x) => !!(x && typeof x === 'object' && x[INFO]);
const q = (nome) => '"' + String(nome).replace(/"/g, '""') + '"';

// ============================================================================ colunas (drizzle-orm/mysql-core)
class Coluna {
  constructor(nomeSql, tipo, cfg) {
    this.nomeSql = typeof nomeSql === 'string' ? nomeSql : null;
    this.tipo = tipo;
    this.cfg = (typeof nomeSql === 'object' && nomeSql) || cfg || {};
    this._notNull = false; this._pk = false; this._unique = false; this._uniqueNome = null;
    this._temDefault = false; this._default = undefined; this._defaultNow = false; this._defaultFn = null;
    this._onUpdate = null; this._auto = tipo === 'serial';
    this.valores = null; this.tabela = null; this.chave = null;
  }
  notNull() { this._notNull = true; return this; }
  primaryKey() { this._pk = true; this._notNull = true; return this; }
  unique(nome) { this._unique = true; this._uniqueNome = nome || null; return this; }
  default(v) { this._temDefault = true; this._default = v; return this; }
  defaultNow() { this._defaultNow = true; return this; }
  $defaultFn(fn) { this._defaultFn = fn; return this; }
  $default(fn) { return this.$defaultFn(fn); }
  $onUpdate(fn) { this._onUpdate = fn; return this; }
  $onUpdateFn(fn) { return this.$onUpdate(fn); }
  onUpdateNow() { this._onUpdate = () => new Date(); return this; }
  autoincrement() { this._auto = true; return this; }
  $type() { return this; }
  references() { return this; }
}
const fabrica = (tipo) => (nome, cfg) => new Coluna(nome, tipo, cfg);
export const serial = (nome) => new Coluna(nome, 'serial').notNull();
export const varchar = fabrica('varchar');
export const char = fabrica('varchar');
export const text = fabrica('varchar');
export const tinytext = fabrica('varchar');
export const mediumtext = fabrica('varchar');
export const longtext = fabrica('varchar');
export const int = fabrica('int');
export const tinyint = fabrica('int');
export const smallint = fabrica('int');
export const mediumint = fabrica('int');
export const bigint = fabrica('int');
export const double = fabrica('real');
export const float = fabrica('real');
export const real = fabrica('real');
export const decimal = fabrica('real');
export const boolean = fabrica('boolean');
export const timestamp = fabrica('timestamp');
export const datetime = fabrica('timestamp');
export const date = fabrica('timestamp');
export const json = fabrica('json');
export function mysqlEnum(nome, valores) {
  const c = new Coluna(typeof nome === 'string' ? nome : null, 'enum');
  c.valores = Array.isArray(nome) ? nome : valores;
  return c;
}

export function mysqlTable(nome, colunas, extra) {
  const t = {};
  const info = { nome, colunas: {}, indices: [] };
  for (const [k, c] of Object.entries(colunas)) {
    if (!c.nomeSql) c.nomeSql = k;
    c.tabela = t; c.chave = k;
    info.colunas[k] = c; t[k] = c;
  }
  Object.defineProperty(t, INFO, { value: info });
  if (typeof extra === 'function') {
    let r = extra(t);
    if (r && !Array.isArray(r)) r = Object.values(r);
    info.indices = (r || []).filter(Boolean);
  }
  return t;
}
export const mysqlTableCreator = () => mysqlTable;
const indice = (tipo) => (nome) => { const o = { tipo, nome, cols: [] }; o.on = (...cols) => { o.cols = cols; return o; }; o.using = () => o; return o; };
export const uniqueIndex = indice('unique');
export const index = indice('index');
export const unique = (nome) => indice('unique')(nome || 'uq');
export function primaryKey(cfg, ...resto) { const cols = Array.isArray(cfg?.columns) ? cfg.columns : [cfg, ...resto].filter(Boolean); return { tipo: 'pk', nome: cfg?.name || 'PRIMARY', cols }; }
export function getTableName(t) { return t[INFO].nome; }
export function getTableColumns(t) { return { ...t[INFO].colunas }; }

// ============================================================================ valores (JS ⇄ SQLite)
function paraSql(col, v) {
  if (v === undefined || v === null) return null;
  const tipo = col && col.tipo;
  if (tipo === 'json') return JSON.stringify(v);
  if (v instanceof Date) return v.getTime();
  if (tipo === 'timestamp') return typeof v === 'string' ? Date.parse(v) : Number(v);
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'bigint') return Number(v);
  if (typeof v === 'object') return JSON.stringify(v);
  return v;
}
function deSql(col, v) {
  if (v === null || v === undefined) return null;
  switch (col && col.tipo) {
    case 'boolean': return !!v;
    case 'json': if (typeof v !== 'string') return v; try { return JSON.parse(v); } catch (_) { return v; }
    case 'timestamp': return new Date(Number(v));
    case 'serial': case 'int': case 'real': return Number(v);
    default: return v;
  }
}

// ============================================================================ SQL (drizzle-orm: sql, eq, and, …)
class Param { constructor(valor, col) { this.valor = valor; this.col = col || null; } }
class Sql {
  constructor(partes) { this.partes = partes || []; this._alias = null; this._map = null; }
  as(alias) { this._alias = alias; return this; }
  mapWith(fn) { this._map = typeof fn === 'function' ? fn : (fn && typeof fn.mapFromDriverValue === 'function' ? (v) => fn.mapFromDriverValue(v) : null); return this; }
  inlineParams() { return this; }
  append(o) { this.partes.push(o); return this; }
  getSQL() { return this; }
}
// (o texto do molde é SQL; o que vem nos ${…} é valor — vira parâmetro —, a não ser coluna, tabela, outro sql ou lista)
const embrulha = (v) => (v === null || v === undefined || typeof v !== 'object' || v instanceof Date ? new Param(v) : v);
export function sql(strings, ...vals) {
  const partes = [];
  strings.forEach((s, i) => { partes.push(s); if (i < vals.length) partes.push(embrulha(vals[i])); });
  return new Sql(partes);
}
sql.raw = (txt) => new Sql([String(txt)]);
sql.empty = () => new Sql([]);
sql.join = (lista, sep) => { const p = []; (lista || []).forEach((x, i) => { if (i && sep !== undefined) p.push(typeof sep === 'string' ? sep : sep); p.push(embrulha(x)); }); return new Sql(p); };
sql.param = (v) => new Param(v);
sql.identifier = (nome) => new Sql([q(nome)]);

function renderiza(x, ctx) {
  if (x === undefined || x === null) { ctx.params.push(null); return '?'; }
  if (x instanceof Sql) { let s = ''; for (const p of x.partes) s += (typeof p === 'string' ? p : renderizaValor(p, ctx)); return s; }
  return renderizaValor(x, ctx);
}
function renderizaValor(x, ctx) {
  if (x instanceof Sql) return renderiza(x, ctx);
  if (x instanceof Coluna) return ctx.semTabela ? q(x.nomeSql) : q(x.tabela[INFO].nome) + '.' + q(x.nomeSql);
  if (ehTabela(x)) return q(x[INFO].nome);
  if (x instanceof Param) { ctx.params.push(paraSql(x.col, x.valor)); return '?'; }
  if (Array.isArray(x)) return '(' + x.map((v) => renderizaValor(v instanceof Param ? v : new Param(v), ctx)).join(', ') + ')';
  ctx.params.push(paraSql(null, x));
  return '?';
}
const lado = (a, b) => (b instanceof Coluna || b instanceof Sql ? b : new Param(b, a instanceof Coluna ? a : null));
const bin = (op) => (a, b) => sql`${a} ${sql.raw(op)} ${lado(a, b)}`;
export const eq = bin('=');
export const ne = bin('<>');
export const gt = bin('>');
export const gte = bin('>=');
export const lt = bin('<');
export const lte = bin('<=');
export const like = (a, b) => sql`${a} like ${lado(a, b)} escape '\\'`;
export const notLike = (a, b) => sql`${a} not like ${lado(a, b)} escape '\\'`;
export const ilike = like;
export const isNull = (a) => sql`${a} is null`;
export const isNotNull = (a) => sql`${a} is not null`;
export const not = (c) => sql`not (${c})`;
export const between = (a, x, y) => sql`${a} between ${lado(a, x)} and ${lado(a, y)}`;
export function inArray(a, lista) {
  if (lista instanceof Sql) return sql`${a} in ${lista}`;
  if (!lista || !lista.length) return sql`0 = 1`;
  return sql`${a} in ${lista.map((v) => new Param(v, a instanceof Coluna ? a : null))}`;
}
export function notInArray(a, lista) {
  if (!lista || !lista.length) return sql`1 = 1`;
  return sql`${a} not in ${lista.map((v) => new Param(v, a instanceof Coluna ? a : null))}`;
}
export const exists = (sub) => sql`exists ${sub}`;
export const notExists = (sub) => sql`not exists ${sub}`;
function junta(op, conds) {
  const c = conds.filter((x) => x !== undefined && x !== null);
  if (!c.length) return undefined;
  if (c.length === 1) return c[0];
  const p = ['('];
  c.forEach((x, i) => { if (i) p.push(' ' + op + ' '); p.push('('); p.push(x); p.push(')'); });
  p.push(')');
  return new Sql(p);
}
export const and = (...c) => junta('and', c);
export const or = (...c) => junta('or', c);
export const asc = (c) => sql`${c} asc`;
export const desc = (c) => sql`${c} desc`;
export const count = (c) => (c ? sql`count(${c})` : sql`count(*)`).mapWith(Number);
export const countDistinct = (c) => sql`count(distinct ${c})`.mapWith(Number);
export const sum = (c) => sql`sum(${c})`;
export const max = (c) => sql`max(${c})`;
export const min = (c) => sql`min(${c})`;
export const avg = (c) => sql`avg(${c})`;
export const relations = () => ({});
export class TransactionRollbackError extends Error { constructor() { super('Rollback'); this.name = 'TransactionRollbackError'; } }

// ============================================================================ o banco
const OPS = { eq, ne, gt, gte, lt, lte, like, notLike, ilike, isNull, isNotNull, not, between, inArray, notInArray, exists, notExists, and, or, sql };
const OPS_ORDEM = { asc, desc, sql };

function erroMysql(e, tabelaInfo) {
  const m = /UNIQUE constraint failed: (.+)$/.exec(String(e && e.message));
  if (!m) return e;
  const cols = m[1].split(',').map((s) => s.trim().split('.').pop());
  let chave = 'PRIMARY';
  if (tabelaInfo) {
    const ix = tabelaInfo.indices.find((i) => i.tipo === 'unique' && i.cols.length === cols.length && i.cols.every((c) => cols.includes(c.nomeSql)));
    if (ix) chave = ix.nome;
    else { const c = Object.values(tabelaInfo.colunas).find((c) => c._unique && cols.length === 1 && c.nomeSql === cols[0]); if (c) chave = c._uniqueNome || tabelaInfo.nome + '_' + c.nomeSql + '_unique'; }
  }
  const err = new Error(`Duplicate entry for key '${tabelaInfo ? tabelaInfo.nome + '.' : ''}${chave}' (ER_DUP_ENTRY 1062)`);
  err.code = 'ER_DUP_ENTRY'; err.errno = 1062; err.sqlMessage = err.message; err.cause = e;
  return err;
}

function ddlTabela(info) {
  const defs = [];
  const pkComposta = info.indices.find((i) => i.tipo === 'pk');
  const pks = Object.values(info.colunas).filter((c) => c._pk);
  for (const c of Object.values(info.colunas)) {
    let s = q(c.nomeSql) + ' ';
    if (c.tipo === 'serial') { s += 'INTEGER PRIMARY KEY AUTOINCREMENT'; defs.push(s); continue; }
    s += c.tipo === 'int' || c.tipo === 'boolean' || c.tipo === 'timestamp' ? 'INTEGER' : c.tipo === 'real' ? 'REAL' : 'TEXT';
    if (c._pk && pks.length === 1 && !pkComposta) s += ' PRIMARY KEY';
    if (c._notNull) s += ' NOT NULL';
    if (c._unique) s += ' UNIQUE';
    defs.push(s);
  }
  if (pkComposta) defs.push('PRIMARY KEY (' + pkComposta.cols.map((c) => q(c.nomeSql)).join(', ') + ')');
  else if (pks.length > 1) defs.push('PRIMARY KEY (' + pks.map((c) => q(c.nomeSql)).join(', ') + ')');
  const l = ['CREATE TABLE IF NOT EXISTS ' + q(info.nome) + ' (' + defs.join(', ') + ')'];
  for (const i of info.indices) {
    if (i.tipo === 'pk') continue;
    l.push('CREATE ' + (i.tipo === 'unique' ? 'UNIQUE ' : '') + 'INDEX IF NOT EXISTS ' + q(info.nome + '__' + i.nome) + ' ON ' + q(info.nome) + ' (' + i.cols.map((c) => q(c.nomeSql)).join(', ') + ')');
  }
  return l;
}

// MySQL → SQLite nas consultas cruas (db.execute): só o que o código da plataforma usa
function traduzCru(txt, conn) {
  const agora = Date.now();
  const d = new Date(agora);
  const meiaNoiteUtc = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const meiaNoiteLocal = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  let t = txt.replace(/\bNOW\(\)/gi, String(agora)).replace(/\bUTC_TIMESTAMP\(\)/gi, String(agora))
    .replace(/\bUTC_DATE\(\)/gi, String(meiaNoiteUtc)).replace(/\bCURDATE\(\)/gi, String(meiaNoiteLocal))
    .replace(/\s+FOR\s+UPDATE\b/gi, '').replace(/\s+LOCK\s+IN\s+SHARE\s+MODE\b/gi, '');
  let pegaUltimo = false;
  if (/LAST_INSERT_ID\s*\(\s*[^)\s]/i.test(t) && /^\s*UPDATE/i.test(t)) {
    t = t.replace(/LAST_INSERT_ID\s*\(([^()]*(?:\([^()]*\)[^()]*)*)\)/i, '($1)');
    const m = /SET\s+[`"]?(\w+)[`"]?\s*=/i.exec(t);
    t += ' RETURNING ' + (m ? q(m[1]) : '*') + ' AS __ultimo';
    pegaUltimo = true;
  }
  t = t.replace(/LAST_INSERT_ID\(\s*\)/gi, String(conn.ultimoId || 0));
  return { t, pegaUltimo };
}

class Banco {
  constructor(sqlite, schema) {
    this.sqlite = sqlite;
    this.tabelas = {};
    this.porNome = new Map();
    this.ultimoId = 0;
    this.trava = null;
    for (const [k, v] of Object.entries(schema || {})) if (ehTabela(v)) { this.tabelas[k] = v; this.porNome.set(v[INFO].nome, v); }
    for (const t of Object.values(this.tabelas)) for (const s of ddlTabela(t[INFO])) sqlite.exec(s);
  }
}

class Consulta {
  constructor(db) { this.db = db; }
  then(ok, falha) { return this._roda().then(ok, falha); }
  catch(f) { return this._roda().catch(f); }
  finally(f) { return this._roda().finally(f); }
  async _roda() {
    await this.db._espera();
    return this._executa();
  }
}

function montaWhere(where, campos) {
  if (typeof where === 'function') return where(campos, OPS);
  return where;
}
function montaOrdem(orderBy, campos) {
  if (!orderBy) return [];
  const o = typeof orderBy === 'function' ? orderBy(campos, OPS_ORDEM) : orderBy;
  return Array.isArray(o) ? o : [o];
}

class Db {
  constructor(banco, token) {
    this._b = banco; this._token = token || null;
    this.query = {};
    for (const [k, t] of Object.entries(banco.tabelas)) {
      this.query[k] = {
        findFirst: (o = {}) => this._consultaRel(t, Object.assign({}, o, { limit: 1 })).then((l) => l[0]),
        findMany: (o = {}) => this._consultaRel(t, o),
      };
    }
  }
  async _espera() {
    while (this._b.trava && this._b.trava.token !== this._token) await this._b.trava.promessa;
  }
  _roda(texto, params, info, modo) {
    try {
      const st = this._b.sqlite.prepare(texto);
      if (modo === 'todas') return st.all(...params);
      return st.run(...params);
    } catch (e) {
      throw erroMysql(e, info);
    }
  }
  async _consultaRel(t, o) {
    await this._espera();
    const info = t[INFO];
    const ctx = { params: [] };
    let s = 'SELECT * FROM ' + q(info.nome);
    const w = montaWhere(o.where, t);
    if (w) s += ' WHERE ' + renderiza(w, ctx);
    const ord = montaOrdem(o.orderBy, t);
    if (ord.length) s += ' ORDER BY ' + ord.map((x) => renderiza(x, ctx)).join(', ');
    if (o.limit !== undefined) { s += ' LIMIT ?'; ctx.params.push(o.limit); }
    if (o.offset !== undefined) { if (o.limit === undefined) s += ' LIMIT -1'; s += ' OFFSET ?'; ctx.params.push(o.offset); }
    const linhas = this._roda(s, ctx.params, info, 'todas');
    const sel = o.columns ? Object.entries(o.columns) : null;
    const inclui = sel && sel.some(([, v]) => v) ? new Set(sel.filter(([, v]) => v).map(([k]) => k)) : null;
    const exclui = sel && !inclui ? new Set(sel.filter(([, v]) => !v).map(([k]) => k)) : null;
    return linhas.map((l) => {
      const r = {};
      for (const [k, c] of Object.entries(info.colunas)) {
        if (inclui && !inclui.has(k)) continue;
        if (exclui && exclui.has(k)) continue;
        r[k] = deSql(c, l[c.nomeSql]);
      }
      return r;
    });
  }
  select(campos) { return new Select(this, campos); }
  selectDistinct(campos) { const s = new Select(this, campos); s._distinct = true; return s; }
  insert(t) { return new Insert(this, t); }
  update(t) { return new Update(this, t); }
  delete(t) { return new Delete(this, t); }
  async execute(consulta) {
    await this._espera();
    const ctx = { params: [] };
    const bruto = renderiza(consulta instanceof Sql ? consulta : sql.raw(String(consulta)), ctx);
    const { t, pegaUltimo } = traduzCru(bruto, this._b);
    const tabela = /(?:from|update|into)\s+[`"]?(\w+)/i.exec(t);
    const info = tabela && this._b.porNome.get(tabela[1]) ? this._b.porNome.get(tabela[1])[INFO] : null;
    if (/^\s*(select|with)\b/i.test(t)) return [this._roda(t, ctx.params, info, 'todas'), []];
    if (pegaUltimo) {
      const l = this._roda(t, ctx.params, info, 'todas');
      if (l.length) this._b.ultimoId = Number(l[0].__ultimo);
      return [{ affectedRows: l.length, changedRows: l.length, insertId: this._b.ultimoId }, undefined];
    }
    const r = this._roda(t, ctx.params, info, 'run');
    if (/^\s*insert/i.test(t)) this._b.ultimoId = Number(r.lastInsertRowid);
    return [{ affectedRows: Number(r.changes), changedRows: Number(r.changes), insertId: Number(r.lastInsertRowid) }, undefined];
  }
  async transaction(fn) {
    if (this._token) {                                         // transação dentro de transação: SAVEPOINT
      const nome = 'sp' + Math.random().toString(36).slice(2, 8);
      this._b.sqlite.exec('SAVEPOINT ' + nome);
      try { const r = await fn(this); this._b.sqlite.exec('RELEASE ' + nome); return r; }
      catch (e) { this._b.sqlite.exec('ROLLBACK TO ' + nome); this._b.sqlite.exec('RELEASE ' + nome); throw e; }
    }
    await this._espera();
    while (this._b.trava) await this._b.trava.promessa;
    let solta;
    const token = Symbol('tx');
    this._b.trava = { token, promessa: new Promise((r) => { solta = r; }) };
    const tx = new Db(this._b, token);
    tx.rollback = () => { throw new TransactionRollbackError(); };
    this._b.sqlite.exec('BEGIN');
    try {
      const r = await fn(tx);
      this._b.sqlite.exec('COMMIT');
      return r;
    } catch (e) {
      this._b.sqlite.exec('ROLLBACK');
      throw e;
    } finally {
      this._b.trava = null;
      solta();
    }
  }
}

// ---------------------------------------------------------------- SELECT
function achata(campos, pref, lista) {
  for (const [k, v] of Object.entries(campos)) {
    const nome = pref ? pref + '.' + k : k;
    if (v instanceof Coluna || v instanceof Sql) lista.push({ caminho: nome.split('.'), v });
    else if (ehTabela(v)) for (const [ck, c] of Object.entries(v[INFO].colunas)) lista.push({ caminho: (nome + '.' + ck).split('.'), v: c, grupo: nome, tabela: v });
    else if (v && typeof v === 'object') achata(v, nome, lista);
  }
}
class Select extends Consulta {
  constructor(db, campos) { super(db); this.campos = campos; this.de = null; this.juncoes = []; this.onde = undefined; this.ordem = []; this.lim = undefined; this.desloc = undefined; this.grupo = []; this.ter = undefined; this._distinct = false; }
  from(t) { this.de = t; return this; }
  leftJoin(t, on) { this.juncoes.push({ tipo: 'LEFT JOIN', t, on }); return this; }
  innerJoin(t, on) { this.juncoes.push({ tipo: 'INNER JOIN', t, on }); return this; }
  rightJoin(t, on) { this.juncoes.push({ tipo: 'LEFT JOIN', t, on, aviso: 'right' }); return this; }
  where(c) { this.onde = c; return this; }
  orderBy(...o) { this.ordem = o.flat().filter(Boolean); return this; }
  groupBy(...g) { this.grupo = g.flat(); return this; }
  having(c) { this.ter = c; return this; }
  limit(n) { this.lim = n; return this; }
  offset(n) { this.desloc = n; return this; }
  for() { return this; }
  $dynamic() { return this; }
  as(alias) { this._alias = alias; return this; }
  _executa() {
    let campos = this.campos;
    const tabelas = [this.de, ...this.juncoes.map((j) => j.t)];
    if (!campos) {
      if (this.juncoes.length) { campos = {}; for (const t of tabelas) campos[t[INFO].nome] = t; }
      else campos = { ...this.de[INFO].colunas };
    }
    const lista = [];
    achata(campos, '', lista);
    const ctx = { params: [] };
    let s = 'SELECT ' + (this._distinct ? 'DISTINCT ' : '') + lista.map((f, i) => renderiza(f.v, ctx) + ' AS ' + q('f' + i)).join(', ');
    s += ' FROM ' + q(this.de[INFO].nome);
    for (const j of this.juncoes) s += ' ' + j.tipo + ' ' + q(j.t[INFO].nome) + ' ON ' + renderiza(j.on, ctx);
    if (this.onde) s += ' WHERE ' + renderiza(this.onde, ctx);
    if (this.grupo.length) s += ' GROUP BY ' + this.grupo.map((g) => renderiza(g, ctx)).join(', ');
    if (this.ter) s += ' HAVING ' + renderiza(this.ter, ctx);
    if (this.ordem.length) s += ' ORDER BY ' + this.ordem.map((o) => renderiza(o, ctx)).join(', ');
    if (this.lim !== undefined) { s += ' LIMIT ?'; ctx.params.push(this.lim); }
    if (this.desloc !== undefined) { if (this.lim === undefined) s += ' LIMIT -1'; s += ' OFFSET ?'; ctx.params.push(this.desloc); }
    const linhas = this.db._roda(s, ctx.params, this.de[INFO], 'todas');
    return linhas.map((l) => {
      const r = {};
      const grupos = {};
      lista.forEach((f, i) => {
        let v = l['f' + i];
        v = f.v instanceof Coluna ? deSql(f.v, v) : (f.v._map ? (v === null ? null : f.v._map(v)) : v);
        let o = r;
        for (let k = 0; k < f.caminho.length - 1; k++) { o[f.caminho[k]] = o[f.caminho[k]] || {}; o = o[f.caminho[k]]; }
        o[f.caminho[f.caminho.length - 1]] = v;
        if (f.grupo) { grupos[f.grupo] = grupos[f.grupo] || { todosNulos: true, tabela: f.tabela }; if (v !== null) grupos[f.grupo].todosNulos = false; }
      });
      for (const [g, st] of Object.entries(grupos)) if (st.todosNulos && st.tabela !== this.de) {   // (a tabela do left join sem par vira null, como no drizzle)
        const cam = g.split('.'); let o = r; for (let k = 0; k < cam.length - 1; k++) o = o[cam[k]];
        o[cam[cam.length - 1]] = null;
      }
      return r;
    });
  }
}

// ---------------------------------------------------------------- INSERT
class Insert extends Consulta {
  constructor(db, t) { super(db); this.t = t; this.linhas = []; this.dup = null; this.ignora = false; this.retorna = false; }
  values(v) { this.linhas = Array.isArray(v) ? v : [v]; return this; }
  onDuplicateKeyUpdate(o) { this.dup = (o && o.set) || {}; return this; }
  ignore() { this.ignora = true; return this; }
  $returningId() { this.retorna = true; return this; }
  _executa() {
    const info = this.t[INFO];
    if (!this.linhas.length) throw new Error('insert sem linhas');
    const prontas = this.linhas.map((l) => {
      const r = {};
      for (const [k, c] of Object.entries(info.colunas)) {
        let v = l[k];
        if (v === undefined) {
          if (c._defaultFn) v = c._defaultFn();
          else if (c._defaultNow) v = new Date();
          else if (c._temDefault) v = c._default;
          else if (c._auto) continue;
          else if (c._onUpdate) v = c._onUpdate();
          else continue;
        }
        r[k] = v;
      }
      return r;
    });
    const chaves = [...new Set(prontas.flatMap((r) => Object.keys(r)))];
    const ctx = { params: [] };
    const cols = chaves.map((k) => q(info.colunas[k].nomeSql)).join(', ');
    const vals = prontas.map((r) => '(' + chaves.map((k) => {
      const v = r[k];
      if (v === undefined) { const c = info.colunas[k]; return c._notNull ? renderiza(new Param(c._temDefault ? c._default : null, c), ctx) : 'NULL'; }
      return v instanceof Sql ? renderiza(v, ctx) : renderiza(new Param(v, info.colunas[k]), ctx);
    }).join(', ') + ')').join(', ');
    let s = 'INSERT ' + (this.ignora ? 'OR IGNORE ' : '') + 'INTO ' + q(info.nome) + ' (' + cols + ') VALUES ' + vals;
    if (this.dup) {
      const sets = Object.entries(this.dup).filter(([k]) => info.colunas[k]).map(([k, v]) => q(info.colunas[k].nomeSql) + ' = ' + (v instanceof Sql || v instanceof Coluna ? renderiza(v, ctx) : renderiza(new Param(v, info.colunas[k]), ctx)));
      s += sets.length ? ' ON CONFLICT DO UPDATE SET ' + sets.join(', ') : ' ON CONFLICT DO NOTHING';
    }
    const r = this.db._roda(s, ctx.params, info, 'run');
    const ultimo = Number(r.lastInsertRowid);
    const primeiro = Number(r.changes) > 0 && !this.dup ? ultimo - (prontas.length - 1) : ultimo;
    if (Number(r.changes) > 0) this.db._b.ultimoId = primeiro;
    if (this.retorna) {
      const pk = Object.entries(info.colunas).find(([, c]) => c._pk || c.tipo === 'serial');
      return prontas.map((_, i) => ({ [pk ? pk[0] : 'id']: primeiro + i }));
    }
    return [{ affectedRows: Number(r.changes), insertId: primeiro, changedRows: 0 }, undefined];
  }
}

// ---------------------------------------------------------------- UPDATE / DELETE
class Update extends Consulta {
  constructor(db, t) { super(db); this.t = t; this.valores = {}; this.onde = undefined; }
  set(v) { this.valores = v || {}; return this; }
  where(c) { this.onde = c; return this; }
  _executa() {
    const info = this.t[INFO];
    const v = { ...this.valores };
    for (const [k, c] of Object.entries(info.colunas)) if (c._onUpdate && v[k] === undefined) v[k] = c._onUpdate();
    const ctx = { params: [] };
    const sets = Object.entries(v).filter(([k, x]) => info.colunas[k] && x !== undefined)
      .map(([k, x]) => q(info.colunas[k].nomeSql) + ' = ' + (x instanceof Sql || x instanceof Coluna ? renderiza(x, ctx) : renderiza(new Param(x, info.colunas[k]), ctx)));
    if (!sets.length) return [{ affectedRows: 0, changedRows: 0, insertId: 0 }, undefined];
    let s = 'UPDATE ' + q(info.nome) + ' SET ' + sets.join(', ');
    if (this.onde) s += ' WHERE ' + renderiza(this.onde, ctx);
    const r = this.db._roda(s, ctx.params, info, 'run');
    return [{ affectedRows: Number(r.changes), changedRows: Number(r.changes), insertId: 0 }, undefined];
  }
}
class Delete extends Consulta {
  constructor(db, t) { super(db); this.t = t; this.onde = undefined; }
  where(c) { this.onde = c; return this; }
  _executa() {
    const info = this.t[INFO];
    const ctx = { params: [] };
    let s = 'DELETE FROM ' + q(info.nome);
    if (this.onde) s += ' WHERE ' + renderiza(this.onde, ctx);
    const r = this.db._roda(s, ctx.params, info, 'run');
    return [{ affectedRows: Number(r.changes), changedRows: 0, insertId: 0 }, undefined];
  }
}

// ============================================================================ drizzle-orm/mysql2: drizzle(url, {schema})
// O arquivo do banco: globalThis.__RACHA_SQLITE (o caminho, ou ':memory:'), ou a variável RACHA_SQLITE. Um banco por
// processo (o mesmo para todas as chamadas de getDb()).
let compartilhado = null;
export function drizzle(_url, opcoes) {
  const o = (opcoes && typeof opcoes === 'object') ? opcoes : (_url && typeof _url === 'object' ? _url : {});
  if (!compartilhado) {
    const arquivo = globalThis.__RACHA_SQLITE || process.env.RACHA_SQLITE || ':memory:';
    const sqlite = new DatabaseSync(arquivo);
    sqlite.exec('PRAGMA journal_mode = WAL');
    sqlite.exec('PRAGMA foreign_keys = OFF');
    compartilhado = new Banco(sqlite, o.schema || {});
  }
  return new Db(compartilhado);
}
export function _bancoDeTeste() { return compartilhado; }   // (os testes leem o banco direto: tests/plataforma/*.mjs)
