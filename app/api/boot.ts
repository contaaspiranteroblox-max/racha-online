import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";

const app = new Hono<{ Bindings: HttpBindings }>();

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));
app.use("/api/trpc/*", async (c) => {
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
    });
    console.log("Servidor da turma (salas online) no mesmo endereço: ws(s)://<este endereço>/");
    // v88.1: se as contas já foram zeradas, o bilhete assinado antes disso continua sem valer (mesmo depois de reiniciar)
    const { contasZeradasEm } = await import("./racha/contas");
    const { marcaContasZeradas } = await import("./lib/salas");
    marcaContasZeradas(await contasZeradasEm().catch(() => null));
  }
}
