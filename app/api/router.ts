import { createRouter, publicQuery } from "./middleware";
import { authRouter } from "./racha/authRouter";
import { jogoRouter } from "./racha/jogoRouter";
import { perfilRouter } from "./racha/perfilRouter";
import { amigosRouter } from "./racha/amigosRouter";
import { adminRouter } from "./racha/adminRouter";
import { clubeRouter } from "./racha/clubeRouter";
import { progressoRouter } from "./racha/progressoRouter";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),

  auth: authRouter,
  jogo: jogoRouter,
  perfil: perfilRouter,
  amigos: amigosRouter,
  admin: adminRouter,
  clubes: clubeRouter, // v69: os clubes (e a tampinha personalizada da conta)
  progresso: progressoRouter, // v82: o progresso do jogo na conta (o save na nuvem)
});

export type AppRouter = typeof appRouter;
