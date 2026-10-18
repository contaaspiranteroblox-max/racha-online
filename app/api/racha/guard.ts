// ============================================================================
// RACHA 2.0 — Guardas: sessão, RBAC, rate limit, auditoria
// A segurança mora NO SERVIDOR. O cargo nunca vem do navegador.
// ============================================================================
import { TRPCError } from "@trpc/server";
import { and, eq, gt, isNull } from "drizzle-orm";
import { getDb } from "../queries/connection";
import { sessoes, usuarios, cargos, auditoria, limites } from "@db/schema";
import { sha256 } from "./security";
import { PERMISSOES_PADRAO, CARGO_PESO, type Cargo, type Permissao } from "@contracts/racha";
import type { TrpcContext } from "../context";
import { publicQuery } from "../middleware";

export type UsuarioSessao = typeof usuarios.$inferSelect;
export type Sessao = typeof sessoes.$inferSelect;

export const SESSAO_DIAS = 30;
export const SESSAO_ADMIN_HORAS = 8;

// ---------- Sessão ----------
// v88.1: `painel` — as rotas do RACHA CONTROL leem o cookie do painel (racha_admin, gravado no verificar2fa). Antes elas
// liam só o do jogo (racha_sessao): no navegador, o painel voltava para o login depois do 2FA e o SAIR DO PAINEL encerrava
// a sessão do JOGO. O Bearer (o jogo sem o site e os testes) continua valendo para as duas.
export async function sessaoDaRequisicao(req: Request, opcoes: { painel?: boolean } = {}): Promise<{ usuario: UsuarioSessao; sessao: Sessao } | null> {
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
    where: and(eq(sessoes.tokenHash, hash), isNull(sessoes.revogadaEm), gt(sessoes.expiraEm, new Date())),
  });
  if (!s) return null;
  const u = await db.query.usuarios.findFirst({ where: eq(usuarios.id, s.usuarioId) });
  if (!u) return null;
  if (u.estado === "banido") return null;
  if (u.estado === "suspenso" && u.suspensoAte && u.suspensoAte.getTime() > Date.now()) return null;

  // v84 — renovação deslizante (spec 1.4: "Renovar a sessão quando permitido"):
  // sessão de jogo com menos da metade da vida restante ganha um novo prazo cheio
  // a cada uso. Sessão do painel administrativo NÃO renova (8 h fixas por segurança).
  if (!s.painelAdmin) {
    const restante = s.expiraEm.getTime() - Date.now();
    const metade = (SESSAO_DIAS * 24 * 60 * 60 * 1000) / 2;
    if (restante < metade) {
      const novoPrazo = new Date(Date.now() + SESSAO_DIAS * 24 * 60 * 60 * 1000);
      await db.update(sessoes).set({ expiraEm: novoPrazo }).where(eq(sessoes.id, s.id));
      s.expiraEm = novoPrazo;
    }
  }
  return { usuario: u, sessao: s };
}

// ---------- Cargo do usuário (sempre lido do banco) ----------
export async function cargoDo(usuarioId: number): Promise<{ cargo: Cargo; permissoes: Permissao[] } | null> {
  const db = getDb();
  const c = await db.query.cargos.findFirst({ where: eq(cargos.usuarioId, usuarioId) });
  if (!c) return null;
  const base = PERMISSOES_PADRAO[c.cargo];
  // v83 (correção): o ajuste fino do RACHA CONTROL (definirPermissoes) SUBSTITUI o conjunto do cargo — é assim que
  // o Dono tira uma permissão de alguém. null = sem ajuste (vale o padrão do cargo); lista (mesmo vazia) = o conjunto
  // ajustado. A lista já entra no banco filtrada pelo teto do cargo (adminRouter); aqui ela é filtrada de novo por
  // segurança. Antes desta correção, o conjunto sempre saía igual ao padrão e o ajuste não tinha efeito nenhum.
  if (c.cargo === "dono") return { cargo: c.cargo, permissoes: [...base] };
  const ajuste = Array.isArray(c.permissoes) ? (c.permissoes as Permissao[]).filter((p) => base.includes(p)) : null;
  const conjunto = new Set<Permissao>(ajuste ?? base);
  return { cargo: c.cargo, permissoes: [...conjunto] };
}

// ---------- Rate limit persistente (janela deslizante simples por chave) ----------
export async function bateLimite(chave: string, max: number, janelaMs: number): Promise<boolean> {
  const db = getDb();
  const agora = new Date();
  const l = await db.query.limites.findFirst({ where: eq(limites.chave, chave) });
  if (!l || agora.getTime() - l.janelaInicio.getTime() > janelaMs) {
    await db
      .insert(limites)
      .values({ chave, contagem: 1, janelaInicio: agora })
      .onDuplicateKeyUpdate({ set: { contagem: 1, janelaInicio: agora } });
    return false;
  }
  if (l.contagem >= max) return true;
  await db.update(limites).set({ contagem: l.contagem + 1 }).where(eq(limites.chave, chave));
  return false;
}

export function ipDaRequisicao(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "desconhecido"
  );
}

export async function exigeLimite(chave: string, max: number, janelaMs: number, msg: string) {
  if (await bateLimite(chave, max, janelaMs)) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: msg });
  }
}

// ---------- Auditoria ----------
export async function auditar(opts: {
  operadorId: number;
  cargo: string;
  acao: string;
  alvoId?: number | null;
  detalhes?: Record<string, unknown>;
  resultado: "ok" | "negado" | "erro";
  ip?: string;
}) {
  try {
    await getDb().insert(auditoria).values({
      operadorId: opts.operadorId,
      cargoOperador: opts.cargo,
      acao: opts.acao,
      alvoId: opts.alvoId ?? null,
      detalhes: opts.detalhes ?? {},
      resultado: opts.resultado,
      ip: opts.ip ?? null,
    });
  } catch (e) {
    console.error("Falha ao auditar:", e);
  }
}

// ============================================================================
// PROCEDURES
// ============================================================================

// Jogador autenticado (sessão de jogo válida)
export const autenticado = publicQuery.use(async ({ ctx, next }) => {
  const s = await sessaoDaRequisicao(ctx.req);
  if (!s) throw new TRPCError({ code: "UNAUTHORIZED", message: "Entre na sua conta para continuar." });
  return next({ ctx: { ...ctx, usuario: s.usuario, sessao: s.sessao } });
});

export type CtxAutenticado = TrpcContext & { usuario: UsuarioSessao; sessao: Sessao };

// Membro da equipe com sessão do RACHA CONTROL + 2FA verificado
export const adminAutenticado = publicQuery.use(async ({ ctx, next }) => {
  const s = await sessaoDaRequisicao(ctx.req, { painel: true }); // v88.1: o cookie do painel
  if (!s) throw new TRPCError({ code: "UNAUTHORIZED", message: "Acesso restrito à equipe do RACHA." });
  if (!s.sessao.painelAdmin) throw new TRPCError({ code: "FORBIDDEN", message: "Use o login do RACHA CONTROL." });
  const papel = await cargoDo(s.usuario.id);
  if (!papel) throw new TRPCError({ code: "FORBIDDEN", message: "Sua conta não faz parte da equipe." });
  if (!s.sessao.totpVerificado) throw new TRPCError({ code: "FORBIDDEN", message: "Confirme o 2FA do painel." });
  return next({ ctx: { ...ctx, usuario: s.usuario, sessao: s.sessao, papel } });
});

export type CtxAdmin = TrpcContext & { usuario: UsuarioSessao; sessao: Sessao; papel: { cargo: Cargo; permissoes: Permissao[] } };

// Exige uma permissão específica dentro de um handler admin
export function exigePermissao(ctx: CtxAdmin, perm: Permissao) {
  if (!ctx.papel.permissoes.includes(perm)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Seu cargo não tem essa permissão." });
  }
}

// Proteções de hierarquia: não mexer no Dono nem acima do próprio peso
export async function exigeAlvoPermitido(ctx: CtxAdmin, alvoId: number, acao: string) {
  const papelAlvo = await cargoDo(alvoId);
  if (papelAlvo) {
    if (papelAlvo.cargo === "dono" && ctx.papel.cargo !== "dono") {
      await auditar({ operadorId: ctx.usuario.id, cargo: ctx.papel.cargo, acao, alvoId, resultado: "negado", detalhes: { motivo: "alvo é o Dono" }, ip: ipDaRequisicao(ctx.req) });
      throw new TRPCError({ code: "FORBIDDEN", message: "A conta do Dono é protegida." });
    }
    if (alvoId !== ctx.usuario.id && CARGO_PESO[papelAlvo.cargo] >= CARGO_PESO[ctx.papel.cargo] && ctx.papel.cargo !== "dono") {
      await auditar({ operadorId: ctx.usuario.id, cargo: ctx.papel.cargo, acao, alvoId, resultado: "negado", detalhes: { motivo: "hierarquia" }, ip: ipDaRequisicao(ctx.req) });
      throw new TRPCError({ code: "FORBIDDEN", message: "Você não pode agir sobre um cargo igual ou maior." });
    }
  }
  return papelAlvo;
}
