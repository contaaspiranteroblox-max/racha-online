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
    ligaSalas(servidor as unknown as import("http").Server, {
      // v79: os selos da conta (verificado, parceiro, equipe, criador) — o V na frente do nome nas salas e no Chat do Brasil
      selosDe: async (usuarioId) => (await getDb().query.selos.findMany({ where: eq(selos.usuarioId, usuarioId) })).map((x) => x.selo),
    });
    console.log("Servidor da turma (salas online) no mesmo endereço: ws(s)://<este endereço>/");
  }
}
