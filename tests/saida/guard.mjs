// stub:stub-trpc
var TRPCError = class extends Error {
  constructor(o) {
    super(o && o.message || o && o.code || "TRPCError");
    this.code = o && o.code;
  }
};

// stub:stub-drizzle
var eq = (col, val) => ({ valor: val });
var and = (...a) => a;
var gt = (a, b) => ({ gt: [a, b] });
var isNull = (a) => ({ isNull: a });

// stub:stub-db
function getDb() {
  return globalThis.__dbFingido;
}

// stub:stub-schema
var cargos = { usuarioId: "col_usuarioId" };
var sessoes = { tokenHash: "", revogadaEm: "", expiraEm: "" };
var usuarios = { id: "" };
var auditoria = {};
var limites = { chave: "" };

// app/api/racha/security.ts
import { createHash, randomBytes, scryptSync, timingSafeEqual, createHmac } from "node:crypto";
function sha256(txt) {
  return createHash("sha256").update(txt).digest("hex");
}

// app/contracts/racha.ts
var CARGO_PESO = { dono: 100, administrador: 70, moderador: 40, ajudante: 10 };
var PERMISSOES = [
  "gerenciar_equipe",
  "definir_permissoes",
  "gerenciar_selos",
  "enviar_itens",
  "gerenciar_eventos",
  "consultar_jogadores",
  "analisar_denuncias",
  "aplicar_punicoes",
  "consultar_registros",
  "distribuir_global",
  "advertir",
  "suspender",
  "ver_denuncias_atribuidas"
];
var PERMISSOES_PADRAO = {
  dono: [...PERMISSOES],
  administrador: [
    "gerenciar_eventos",
    "analisar_denuncias",
    "aplicar_punicoes",
    "enviar_itens",
    "consultar_jogadores",
    "consultar_registros",
    "advertir",
    "suspender"
  ],
  moderador: [
    "consultar_jogadores",
    "analisar_denuncias",
    "advertir",
    "suspender",
    "consultar_registros"
  ],
  ajudante: ["ver_denuncias_atribuidas", "analisar_denuncias"]
};
var SUSPENSAO_MAX_HORAS = {
  dono: 24 * 365,
  administrador: 24 * 90,
  moderador: 24 * 7,
  ajudante: 0
};

// stub:stub-middleware
var publicQuery = { use: (fn) => ({ use: (fn2) => fn2, fn }) };

// app/api/racha/guard.ts
var SESSAO_DIAS = 30;
var SESSAO_ADMIN_HORAS = 8;
async function sessaoDaRequisicao(req, opcoes = {}) {
  const auth = req.headers.get("authorization");
  const cookie = req.headers.get("cookie") || "";
  let token = "";
  if (auth?.startsWith("Bearer ")) token = auth.slice(7).trim();
  if (!token) {
    const m = opcoes.painel ? cookie.match(/(?:^|;\s*)racha_admin=([^;]+)/) : cookie.match(/(?:^|;\s*)racha_sessao=([^;]+)/);
    if (m) token = decodeURIComponent(m[1]);
  }
  if (!token) return null;
  const db = getDb();
  const hash = sha256(token);
  const s = await db.query.sessoes.findFirst({
    where: and(eq(sessoes.tokenHash, hash), isNull(sessoes.revogadaEm), gt(sessoes.expiraEm, /* @__PURE__ */ new Date()))
  });
  if (!s) return null;
  const u = await db.query.usuarios.findFirst({ where: eq(usuarios.id, s.usuarioId) });
  if (!u) return null;
  if (u.estado === "banido") return null;
  if (u.estado === "suspenso" && u.suspensoAte && u.suspensoAte.getTime() > Date.now()) return null;
  if (!s.painelAdmin) {
    const restante = s.expiraEm.getTime() - Date.now();
    const metade = SESSAO_DIAS * 24 * 60 * 60 * 1e3 / 2;
    if (restante < metade) {
      const novoPrazo = new Date(Date.now() + SESSAO_DIAS * 24 * 60 * 60 * 1e3);
      await db.update(sessoes).set({ expiraEm: novoPrazo }).where(eq(sessoes.id, s.id));
      s.expiraEm = novoPrazo;
    }
  }
  return { usuario: u, sessao: s };
}
async function cargoDo(usuarioId) {
  const db = getDb();
  const c = await db.query.cargos.findFirst({ where: eq(cargos.usuarioId, usuarioId) });
  if (!c) return null;
  const base = PERMISSOES_PADRAO[c.cargo];
  if (c.cargo === "dono") return { cargo: c.cargo, permissoes: [...base] };
  const ajuste = Array.isArray(c.permissoes) ? c.permissoes.filter((p) => base.includes(p)) : null;
  const conjunto = new Set(ajuste ?? base);
  return { cargo: c.cargo, permissoes: [...conjunto] };
}
async function bateLimite(chave, max, janelaMs) {
  const db = getDb();
  const agora = /* @__PURE__ */ new Date();
  const l = await db.query.limites.findFirst({ where: eq(limites.chave, chave) });
  if (!l || agora.getTime() - l.janelaInicio.getTime() > janelaMs) {
    await db.insert(limites).values({ chave, contagem: 1, janelaInicio: agora }).onDuplicateKeyUpdate({ set: { contagem: 1, janelaInicio: agora } });
    return false;
  }
  if (l.contagem >= max) return true;
  await db.update(limites).set({ contagem: l.contagem + 1 }).where(eq(limites.chave, chave));
  return false;
}
function ipDaRequisicao(req) {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "desconhecido";
}
async function exigeLimite(chave, max, janelaMs, msg) {
  if (await bateLimite(chave, max, janelaMs)) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: msg });
  }
}
async function auditar(opts) {
  try {
    await getDb().insert(auditoria).values({
      operadorId: opts.operadorId,
      cargoOperador: opts.cargo,
      acao: opts.acao,
      alvoId: opts.alvoId ?? null,
      detalhes: opts.detalhes ?? {},
      resultado: opts.resultado,
      ip: opts.ip ?? null
    });
  } catch (e) {
    console.error("Falha ao auditar:", e);
  }
}
var autenticado = publicQuery.use(async ({ ctx, next }) => {
  const s = await sessaoDaRequisicao(ctx.req);
  if (!s) throw new TRPCError({ code: "UNAUTHORIZED", message: "Entre na sua conta para continuar." });
  return next({ ctx: { ...ctx, usuario: s.usuario, sessao: s.sessao } });
});
var adminAutenticado = publicQuery.use(async ({ ctx, next }) => {
  const s = await sessaoDaRequisicao(ctx.req, { painel: true });
  if (!s) throw new TRPCError({ code: "UNAUTHORIZED", message: "Acesso restrito \xE0 equipe do RACHA." });
  if (!s.sessao.painelAdmin) throw new TRPCError({ code: "FORBIDDEN", message: "Use o login do RACHA CONTROL." });
  const papel = await cargoDo(s.usuario.id);
  if (!papel) throw new TRPCError({ code: "FORBIDDEN", message: "Sua conta n\xE3o faz parte da equipe." });
  if (!s.sessao.totpVerificado) throw new TRPCError({ code: "FORBIDDEN", message: "Confirme o 2FA do painel." });
  return next({ ctx: { ...ctx, usuario: s.usuario, sessao: s.sessao, papel } });
});
function exigePermissao(ctx, perm) {
  if (!ctx.papel.permissoes.includes(perm)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Seu cargo n\xE3o tem essa permiss\xE3o." });
  }
}
async function exigeAlvoPermitido(ctx, alvoId, acao) {
  const papelAlvo = await cargoDo(alvoId);
  if (papelAlvo) {
    if (papelAlvo.cargo === "dono" && ctx.papel.cargo !== "dono") {
      await auditar({ operadorId: ctx.usuario.id, cargo: ctx.papel.cargo, acao, alvoId, resultado: "negado", detalhes: { motivo: "alvo \xE9 o Dono" }, ip: ipDaRequisicao(ctx.req) });
      throw new TRPCError({ code: "FORBIDDEN", message: "A conta do Dono \xE9 protegida." });
    }
    if (alvoId !== ctx.usuario.id && CARGO_PESO[papelAlvo.cargo] >= CARGO_PESO[ctx.papel.cargo] && ctx.papel.cargo !== "dono") {
      await auditar({ operadorId: ctx.usuario.id, cargo: ctx.papel.cargo, acao, alvoId, resultado: "negado", detalhes: { motivo: "hierarquia" }, ip: ipDaRequisicao(ctx.req) });
      throw new TRPCError({ code: "FORBIDDEN", message: "Voc\xEA n\xE3o pode agir sobre um cargo igual ou maior." });
    }
  }
  return papelAlvo;
}
export {
  SESSAO_ADMIN_HORAS,
  SESSAO_DIAS,
  adminAutenticado,
  auditar,
  autenticado,
  bateLimite,
  cargoDo,
  exigeAlvoPermitido,
  exigeLimite,
  exigePermissao,
  ipDaRequisicao,
  sessaoDaRequisicao
};
