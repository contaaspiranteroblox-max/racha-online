import { createRouter, publicQuery } from "./middleware";
import { authRouter } from "./racha/authRouter";
import { jogoRouter } from "./racha/jogoRouter";
import { perfilRouter } from "./racha/perfilRouter";
import { amigosRouter } from "./racha/amigosRouter";
import { adminRouter } from "./racha/adminRouter";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),

  auth: authRouter,
  jogo: jogoRouter,
  perfil: perfilRouter,
  amigos: amigosRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
