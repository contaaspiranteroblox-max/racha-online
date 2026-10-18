// RACHA · v88 — um tRPC pequeno (o pedaço que a plataforma usa), SÓ PARA OS TESTES: initTRPC.context().create(),
// t.router, t.procedure (.input(zod) .use(meio) .query .mutation), TRPCError e o fetchRequestHandler do adaptador
// fetch (o formato "batch" de verdade: GET ?batch=1&input={"0":{"json":…}} e POST com o mesmo corpo; a resposta
// [{result:{data:{json, meta}}}] ou [{error:{json:{message, code, data:{code, httpStatus, path}}}}]). O jogo fala
// exatamente esse formato (tools/v84/login_cedo.js: R84.api). O tests/plataforma/compila.cjs troca '@trpc/server' e
// '@trpc/server/adapters/fetch' por este arquivo na hora de juntar o código da plataforma.
import superjson from './superjson_lite.mjs';

const STATUS = {
  PARSE_ERROR: 400, BAD_REQUEST: 400, UNAUTHORIZED: 401, PAYMENT_REQUIRED: 402, FORBIDDEN: 403, NOT_FOUND: 404,
  METHOD_NOT_SUPPORTED: 405, TIMEOUT: 408, CONFLICT: 409, PRECONDITION_FAILED: 412, PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415, UNPROCESSABLE_CONTENT: 422, TOO_MANY_REQUESTS: 429, CLIENT_CLOSED_REQUEST: 499,
  INTERNAL_SERVER_ERROR: 500, NOT_IMPLEMENTED: 501, BAD_GATEWAY: 502, SERVICE_UNAVAILABLE: 503, GATEWAY_TIMEOUT: 504,
};
const RPC = { PARSE_ERROR: -32700, BAD_REQUEST: -32600, INTERNAL_SERVER_ERROR: -32603, UNAUTHORIZED: -32001, FORBIDDEN: -32003,
  NOT_FOUND: -32004, METHOD_NOT_SUPPORTED: -32005, TIMEOUT: -32008, CONFLICT: -32009, PRECONDITION_FAILED: -32012,
  PAYLOAD_TOO_LARGE: -32013, UNPROCESSABLE_CONTENT: -32022, TOO_MANY_REQUESTS: -32029 };

export class TRPCError extends Error {
  constructor(o = {}) {
    super(o.message || o.code || 'TRPCError', o.cause ? { cause: o.cause } : undefined);
    this.name = 'TRPCError';
    this.code = o.code || 'INTERNAL_SERVER_ERROR';
  }
}

const PROC = Symbol.for('racha.trpcLite.proc');
function construtor(def) {
  const b = {
    _def: def,
    input(schema) { return construtor({ ...def, entradas: [...def.entradas, schema] }); },
    output() { return b; },
    meta() { return b; },
    use(meio) { return construtor({ ...def, meios: [...def.meios, typeof meio === 'function' ? meio : meio._fn] }); },
    concat(outro) { return construtor({ ...def, meios: [...def.meios, ...outro._def.meios] }); },
    query(fn) { return { [PROC]: true, tipo: 'query', def, fn }; },
    mutation(fn) { return { [PROC]: true, tipo: 'mutation', def, fn }; },
    subscription(fn) { return { [PROC]: true, tipo: 'subscription', def, fn }; },
  };
  return b;
}

function cria(opcoes = {}) {
  const procedure = construtor({ entradas: [], meios: [] });
  return {
    _config: { transformer: opcoes.transformer || superjson },
    router: (rotas) => ({ _rotas: rotas, createCaller: (ctx) => chamador(rotas, ctx) }),
    mergeRouters: (...rs) => ({ _rotas: Object.assign({}, ...rs.map((r) => r._rotas)) }),
    procedure,
    middleware: (fn) => ({ _fn: fn }),
  };
}
export const initTRPC = { context: () => ({ create: cria }), create: cria, meta: () => ({ context: () => ({ create: cria }), create: cria }) };

// o caminho "a.b.c" no router
function acha(router, caminho) {
  let n = router;
  for (const p of caminho.split('.')) {
    if (!n) return null;
    const rotas = n._rotas || n;
    n = rotas[p];
  }
  return n && n[PROC] ? n : null;
}

async function valida(schema, valor) {
  if (!schema) return valor;
  if (typeof schema.safeParseAsync === 'function') {
    const r = await schema.safeParseAsync(valor);
    if (r.success) return r.data;
    const msg = (r.error.issues || []).map((i) => (i.path && i.path.length ? i.path.join('.') + ': ' : '') + i.message).join('; ') || 'Entrada inválida';
    const e = new TRPCError({ code: 'BAD_REQUEST', message: msg }); e.zod = r.error.issues; throw e;
  }
  if (typeof schema.parse === 'function') return schema.parse(valor);
  if (typeof schema === 'function') return schema(valor);
  return valor;
}

// roda uma procedure: os meios (use) em ordem, cada next({ctx}) junta o ctx, e no fim a entrada validada vai para o fn
export async function roda(proc, ctx, entradaCrua, caminho, tipo) {
  const meios = proc.def.meios;
  let entrada;
  const passo = async (i, c) => {
    if (i < meios.length) {
      let resultado;
      const r = await meios[i]({
        ctx: c, type: tipo || proc.tipo, path: caminho, input: entradaCrua, getRawInput: async () => entradaCrua,
        next: async (o) => { resultado = await passo(i + 1, o && o.ctx ? { ...c, ...o.ctx } : c); return resultado; },
      });
      return r && r.__trpcOk !== undefined ? r : resultado;
    }
    let v = entradaCrua;
    for (const s of proc.def.entradas) v = await valida(s, v);
    entrada = v;
    const dado = await proc.fn({ ctx: c, input: entrada, type: proc.tipo, path: caminho });
    return { __trpcOk: true, dado };
  };
  const r = await passo(0, ctx);
  return r && r.__trpcOk ? r.dado : r;
}

function chamador(rotas, ctx) {
  const prox = (pref) => new Proxy(function () {}, {
    get: (_, k) => prox(pref ? pref + '.' + String(k) : String(k)),
    apply: (_, __, args) => { const p = acha({ _rotas: rotas }, pref); if (!p) throw new TRPCError({ code: 'NOT_FOUND', message: 'Sem a rota ' + pref }); return roda(p, ctx, args[0], pref, p.tipo); },
  });
  return prox('');
}

function formaErro(e, caminho) {
  const code = e instanceof TRPCError ? e.code : 'INTERNAL_SERVER_ERROR';
  const http = STATUS[code] || 500;
  if (!(e instanceof TRPCError)) console.error('[plataforma de teste] erro em', caminho, e);
  return { error: { json: { message: e && e.message ? e.message : String(e), code: RPC[code] || -32603, data: { code, httpStatus: http, path: caminho } } }, http };
}

// adaptador fetch (como o do @trpc/server): recebe um Request e devolve um Response
export async function fetchRequestHandler({ endpoint, req, router, createContext }) {
  const url = new URL(req.url);
  const resto = url.pathname.slice(url.pathname.indexOf(endpoint) + endpoint.length).replace(/^\//, '');
  const caminhos = decodeURIComponent(resto).split(',').filter(Boolean);
  const batch = url.searchParams.get('batch') === '1';
  const ehGet = req.method === 'GET';
  let entradas = {};
  try {
    if (ehGet) { const i = url.searchParams.get('input'); entradas = i ? JSON.parse(i) : {}; }
    else { const t = await req.text(); entradas = t ? JSON.parse(t) : {}; }
  } catch (_) {
    return new Response(JSON.stringify([{ error: { json: { message: 'JSON inválido', code: -32700, data: { code: 'PARSE_ERROR', httpStatus: 400 } } } }]), { status: 400, headers: { 'content-type': 'application/json' } });
  }
  if (!batch) entradas = { 0: entradas };
  const resHeaders = new Headers();
  const ctx = await createContext({ req, resHeaders, info: { calls: caminhos } });
  const respostas = [];
  for (let i = 0; i < caminhos.length; i++) {
    const caminho = caminhos[i];
    const proc = acha(router, caminho);
    if (!proc) { respostas.push(formaErro(new TRPCError({ code: 'NOT_FOUND', message: `No procedure found on path "${caminho}"` }), caminho)); continue; }
    if ((proc.tipo === 'query') !== ehGet) { respostas.push(formaErro(new TRPCError({ code: 'METHOD_NOT_SUPPORTED', message: 'Use ' + (proc.tipo === 'query' ? 'GET' : 'POST') }), caminho)); continue; }
    const bruto = entradas[i] || entradas[String(i)];
    const crua = bruto && typeof bruto === 'object' && 'json' in bruto ? superjson.deserialize(bruto) : bruto;
    try {
      const dado = await roda(proc, ctx, crua === null ? undefined : crua, caminho, proc.tipo);
      respostas.push({ result: { data: superjson.serialize(dado) } });
    } catch (e) {
      respostas.push(formaErro(e, caminho));
    }
  }
  const comErro = respostas.filter((r) => r.error);
  const status = !comErro.length ? 200 : comErro.length === respostas.length ? comErro[0].http : 207;
  const corpo = respostas.map((r) => (r.error ? { error: r.error } : r));
  resHeaders.set('content-type', 'application/json');
  return new Response(JSON.stringify(batch ? corpo : corpo[0]), { status, headers: resHeaders });
}
export default { initTRPC, TRPCError, fetchRequestHandler };
