// ============================================================================
// RACHA 2.0 — Guardas: sessão, RBAC, rate limit, auditoria
// A segurança mora NO SERVIDOR. O cargo nunca vem do navegador.
// ============================================================================
import { TRPCError } from "@trpc/server";
import { and, eq, gt, gte, isNull, lt, lte, sql } from "drizzle-orm";
import { getDb } from "../queries/connection";
import { sessoes, usuarios, cargos, auditoria, limites } from "@db/schema";
import { sha256 } from "./security";
import { PERMISSOES_PADRAO, CARGO_PESO, type Cargo, type Permissao } from "@contracts/racha";
import type { TrpcContext } from "../context";
import { publicQuery } from "../middleware";
import { ehDuplicado } from "./erros";   // v102: a chave repetida dentro do erro do drizzle (.cause)

export type UsuarioSessao = typeof usuarios.$inferSelect;
export type Sessao = typeof sessoes.$inferSelect;

export const SESSAO_DIAS = 30;
export const SESSAO_ADMIN_HORAS = 8;
// v100 (segurança): a sessão do jogo renova com o uso, mas não passa disto contado do login (depois, entra de novo). Antes ela
// renovava para sempre: um token roubado e usado a cada 15 dias nunca vencia.
export const SESSAO_MAX_DIAS = 90;

// ---------- v100 (segurança): de onde veio o pedido ----------
// O servidor de produção (boot.ts) registra, para cada pedido, o endereço de quem conectou (o socket; atrás do Caddy/nginx,
// o que o NOSSO proxy acrescentou no X-Forwarded-For — server/ip.js) e se ele chegou por https. Os limites por IP e o
// cookie Secure leem daqui. Sem o registro (pedidos montados à mão), vale o fim da lista do X-Forwarded-For — nunca o
// começo, que o próprio cliente escreve (era assim que dava para trocar de "IP" a cada tentativa de senha).
type Origem = { ip: string; https: boolean };
const ORIGENS = new WeakMap<Request, Origem>();
export function registraOrigemDaRequisicao(req: Request, o: Origem): void {
  ORIGENS.set(req, o);
}
export function httpsDaRequisicao(req: Request): boolean {
  if (process.env.RACHA_COOKIE_SEGURO === "1") return true;   // (o https termina num proxy que não diz o X-Forwarded-Proto)
  const o = ORIGENS.get(req);
  if (o) return o.https;
  try { return new URL(req.url).protocol === "https:"; } catch { return false; }
}
// os atributos do cookie da sessão: HttpOnly e SameSite=Lax sempre; Secure quando o pedido chegou por https (ou com
// RACHA_COOKIE_SEGURO=1) — o cookie da conta não viaja aberto por http
export function atributosCookie(req: Request): string {
  return "; Path=/; HttpOnly; SameSite=Lax" + (httpsDaRequisicao(req) ? "; Secure" : "");
}

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
  // v100: até SESSAO_MAX_DIAS depois do login, no máximo (depois disso a sessão vence e o jogo pede para entrar de novo)
  if (!s.painelAdmin) {
    const restante = s.expiraEm.getTime() - Date.now();
    const metade = (SESSAO_DIAS * 24 * 60 * 60 * 1000) / 2;
    const teto = s.criadaEm.getTime() + SESSAO_MAX_DIAS * 24 * 60 * 60 * 1000;
    if (Date.now() >= teto) return null;
    if (restante < metade) {
      const novoPrazo = new Date(Math.min(Date.now() + SESSAO_DIAS * 24 * 60 * 60 * 1000, teto));
      if (novoPrazo.getTime() > s.expiraEm.getTime()) {
        await db.update(sessoes).set({ expiraEm: novoPrazo }).where(eq(sessoes.id, s.id));
        s.expiraEm = novoPrazo;
      }
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
// v100 (segurança): a contagem é atômica — o próprio banco soma (contagem = contagem + 1) só enquanto não chegou no máximo.
// Antes a conta era lida e escrita de volta: pedidos ao mesmo tempo liam o mesmo número e passavam todos (uma rajada de
// tentativas de senha, o mesmo resultado mandado várias vezes de uma vez).
const linhas = (r: unknown) => Number((Array.isArray(r) ? (r[0] as { affectedRows?: number }) : (r as { affectedRows?: number }))?.affectedRows) || 0;
export async function bateLimite(chave: string, max: number, janelaMs: number): Promise<boolean> {
  const db = getDb();
  const agora = new Date(), corte = new Date(agora.getTime() - janelaMs);
  const soma = async () => linhas(await db.update(limites).set({ contagem: sql`${limites.contagem} + 1` })
    .where(and(eq(limites.chave, chave), gt(limites.janelaInicio, corte), lt(limites.contagem, max)))) > 0;
  if (await soma()) return false;                                  // (contou, dentro do limite)
  const l = await db.query.limites.findFirst({ where: eq(limites.chave, chave) });
  if (l && l.janelaInicio.getTime() > corte.getTime()) return true; // (na janela e já no máximo)
  if (l) {                                                          // (a janela venceu: recomeça — só um pedido recomeça)
    if (linhas(await db.update(limites).set({ contagem: 1, janelaInicio: agora }).where(and(eq(limites.chave, chave), lte(limites.janelaInicio, corte)))) > 0) return false;
    return !(await soma());
  }
  try {                                                             // (a primeira vez: a linha nova; outro pedido criou junto: conta nela)
    await db.insert(limites).values({ chave, contagem: 1, janelaInicio: agora });
    return false;
  } catch (e) {
    if (!ehDuplicado(e)) throw e;
    return !(await soma());
  }
}
// v100 (segurança): a tentativa que deu certo não conta (o limite das senhas ERRADAS reserva a tentativa antes de conferir a
// senha — assim uma rajada ao mesmo tempo não passa do limite — e devolve quando a senha estava certa)
export async function devolveTentativa(chave: string): Promise<void> {
  await getDb().update(limites).set({ contagem: sql`${limites.contagem} - 1` }).where(and(eq(limites.chave, chave), gt(limites.contagem, 0)));
}
// v100 (segurança): uma chave que só vale UMA vez (o selo do resultado online): só um pedido consegue criar a linha, mesmo com
// vários chegando juntos; os outros recebem "já usado"
export async function consomeUmaVez(chave: string): Promise<boolean> {
  try {
    await getDb().insert(limites).values({ chave, contagem: 1, janelaInicio: new Date() });
    return true;
  } catch (e) {
    if (ehDuplicado(e)) return false;
    throw e;
  }
}
// v100 (segurança): a parte variável de uma chave de limite, curta (a coluna tem 120 letras; o e-mail pode ter 120 sozinho)
export function parteDaChave(s: string): string {
  return s.length <= 40 ? s : "h" + sha256(s).slice(0, 32);
}
// v100 (segurança): este endereço já entrou nesta conta (uma sessão criada daqui nos últimos 30 dias)? — com a conta travada
// por senhas erradas (alguém tentando adivinhar), quem entra sempre do mesmo lugar ainda entra
export async function enderecoConhecido(usuarioId: number, ip: string): Promise<boolean> {
  if (!ip || ip === "desconhecido") return false;
  const s = await getDb().query.sessoes.findFirst({
    where: and(eq(sessoes.usuarioId, usuarioId), eq(sessoes.ip, ip), gte(sessoes.criadaEm, new Date(Date.now() - 30 * 24 * 3600 * 1000))),
  });
  return !!s;
}

export function ipDaRequisicao(req: Request): string {
  const o = ORIGENS.get(req);
  if (o && o.ip) return o.ip;
  // (sem o registro do servidor não há como saber: um endereço só para todos esses — nunca o que os cabeçalhos dizem, que o
  //  cliente escreve quando o servidor está exposto direto)
  return "desconhecido";
}

// v100 (segurança): já passou do limite? (sem contar este pedido) — para contar só as tentativas ERRADAS de senha
export async function estaNoLimite(chave: string, max: number, janelaMs: number): Promise<boolean> {
  const l = await getDb().query.limites.findFirst({ where: eq(limites.chave, chave) });
  return !!l && Date.now() - l.janelaInicio.getTime() <= janelaMs && l.contagem >= max;
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
