import { Hono } from "hono";
import type { Context } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { registraOrigemDaRequisicao } from "./racha/guard";
import { ipDe, httpsDe } from "../../server/ip.js";

const app = new Hono<{ Bindings: HttpBindings }>();

// v100 (segurança): quem pode pôr o site numa moldura (frame-ancestors): o próprio endereço e os de RACHA_ORIGENS e
// RACHA_MOLDURAS (o jogo publicado em outro endereço que abre as páginas da conta por cima — como no servidor das salas)
const MOLDURAS = ["'self'"].concat((process.env.RACHA_ORIGENS || "").split(","), (process.env.RACHA_MOLDURAS || "").split(/[\s,]+/))
  .map((o) => o.trim()).filter((o) => o === "'self'" || /^https?:\/\/[a-z0-9.-]+(:\d+)?$/i.test(o)).join(" ");

// v100 (segurança): de onde veio cada pedido (o socket; atrás do Caddy/nginx, o que o NOSSO proxy acrescentou no
// X-Forwarded-For — server/ip.js) e se chegou por https: os limites por IP e o cookie Secure leem daqui. E os cabeçalhos de
// proteção em todas as respostas: o jogo só fica dentro de moldura do próprio endereço (frame-ancestors), sem plugins
// (object-src), sem trocar a base dos endereços (base-uri), sem mandar o endereço completo para outros sites
// (Referrer-Policy), sem câmera/microfone/localização/pagamento (Permissions-Policy) e, por https, o HSTS.
// (o bodyLimit troca o objeto do pedido quando o corpo vem em pedaços — Transfer-Encoding: chunked —: a origem é registrada de
//  novo no pedido que chega na API, logo antes dela)
function origemDe(c: Context<{ Bindings: HttpBindings }>): { ip: string; https: boolean } {
  const inc = c.env?.incoming as (import("http").IncomingMessage & { socket?: { remoteAddress?: string; encrypted?: boolean } }) | undefined;
  const remoto = inc?.socket?.remoteAddress;
  return {
    ip: ipDe(remoto, c.req.header("x-forwarded-for"), c.req.header("x-real-ip"), c.req.header("cf-connecting-ip")) || "desconhecido",
    https: httpsDe(remoto, c.req.header("x-forwarded-proto"), !!inc?.socket?.encrypted),
  };
}
app.use("*", async (c, next) => {
  const o = origemDe(c), https = o.https;
  registraOrigemDaRequisicao(c.req.raw, o);
  await next();
  try {
    const h = c.res.headers;
    h.set("X-Content-Type-Options", "nosniff");
    h.set("Referrer-Policy", "same-origin");
    if (!h.has("Content-Security-Policy")) h.set("Content-Security-Policy", "frame-ancestors " + MOLDURAS + "; object-src 'none'; base-uri 'self'");
    h.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
    if (https) h.set("Strict-Transport-Security", "max-age=15552000");
  } catch {
    /* (resposta sem cabeçalhos mutáveis: segue sem eles) */
  }
});
app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));
app.use("/api/trpc/*", async (c) => {
  registraOrigemDaRequisicao(c.req.raw, origemDe(c));   // v100: o pedido que a API recebe (o bodyLimit pode ter trocado)
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

if (env.isProduction) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  // v88.1: a conta do Dono (000001) com a senha da configuração (RACHA_OWNER_PASSWORD) — e o aviso, se ainda for a do manual
  try {
    const { garanteDono } = await import("./racha/contas");
    await garanteDono();
  } catch (e) {
    console.error("Não deu para conferir a conta do Dono:", e);
  }

  const port = parseInt(process.env.PORT || "3000");
  const servidor = serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
  // v70: o servidor da turma (salas online, Chat do Brasil, clubes da turma, copa) no mesmo endereço — RACHA_SALAS=0 desliga
  if (process.env.RACHA_SALAS !== "0") {
    const { ligaSalas } = await import("./lib/salas");
    const { getDb } = await import("./queries/connection");
    const { selos } = await import("@db/schema");
    const { eq } = await import("drizzle-orm");
    const { relacoesPorPub, denunciaDoChat } = await import("./racha/v88/comum");
    ligaSalas(servidor as unknown as import("http").Server, {
      // v79: os selos da conta (verificado, parceiro, equipe, criador) — o V na frente do nome nas salas e no Chat do Brasil
      selosDe: async (usuarioId) => (await getDb().query.selos.findMany({ where: eq(selos.usuarioId, usuarioId) })).map((x) => x.selo),
      // v88: os amigos/bloqueios/privacidade da conta (status online, convites, chat dos amigos e do clube) e as denúncias do chat
      relacoesDe: relacoesPorPub,
      denuncia: denunciaDoChat,
      // v109: o silêncio do chat que a staff deu (até quando e o motivo), do banco, já na conexão
      silencioDe: async (usuarioId) => (await import("./racha/v109/comum109")).silencioAtivo(usuarioId),
    });
    console.log("Servidor da turma (salas online) no mesmo endereço: ws(s)://<este endereço>/");
    // v88.1: se as contas já foram zeradas, o bilhete assinado antes disso continua sem valer (mesmo depois de reiniciar)
    const { contasZeradasEm } = await import("./racha/contas");
    const { marcaContasZeradas } = await import("./lib/salas");
    marcaContasZeradas(await contasZeradasEm().catch(() => null));
  }
}
