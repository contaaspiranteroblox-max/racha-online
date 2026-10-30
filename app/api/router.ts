import { createRouter, publicQuery } from "./middleware";
import { authRouter } from "./racha/authRouter";
import { jogoRouter } from "./racha/jogoRouter";
import { perfilRouter } from "./racha/perfilRouter";
import { amigosRouter } from "./racha/amigosRouter";
import { adminRouter } from "./racha/adminRouter";
import { clubeRouter } from "./racha/clubeRouter";
import { progressoRouter } from "./racha/progressoRouter";
import { socialRouter } from "./racha/v88/social";
import { mensagensRouter } from "./racha/v88/mensagens";
import { correioRouter } from "./racha/v88/correio";
import { lojaRouter } from "./racha/v88/loja";
import { missoesRouter } from "./racha/v88/missoes";
import { passeRouter } from "./racha/v88/passe";
import { eventosRouter } from "./racha/v88/eventos";
import { estatRouter } from "./racha/v88/estat";
import { contaRouter } from "./racha/v88/conta";
import { admin88Router } from "./racha/v88/admin88";
import { donoContasRouter } from "./racha/v88/donoContas";
import { rankingRouter } from "./racha/v90/ranking";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),

  auth: authRouter,
  jogo: jogoRouter,
  perfil: perfilRouter,
  amigos: amigosRouter,
  admin: adminRouter,
  clubes: clubeRouter, // v69: os clubes (e a tampinha personalizada da conta)
  progresso: progressoRouter, // v82: o progresso do jogo na conta (o save na nuvem)
  // v88: a atualização completa dos menus (tudo conferido no servidor)
  social: socialRouter, // o resumo do que chegou, a busca, o perfil de outro jogador, os recentes, a privacidade
  mensagens: mensagensRouter, // a central de mensagens (sistema, amigos, clube, convites, recompensas)
  correio: correioRouter, // as cartas com prêmio (COLETAR uma vez)
  loja: lojaRouter, // a carteira, o inventário, as compras e o equipar
  missoes: missoesRouter, // diárias, semanais, da temporada e especiais
  passe: passeRouter, // o Passe RACHA (grátis e premium)
  eventos: eventosRouter, // a central de eventos
  estat: estatRouter, // as estatísticas da conta com filtro
  conta: contaRouter, // excluir a conta
  admin88: admin88Router, // RACHA CONTROL: eventos, correio e avisos
  ranking: rankingRouter, // v90: o ranking da temporada (gols, assistências, pontos ranqueados, Craque do Jogo) e as temporadas
  donoContas: donoContasRouter, // v88.1: RACHA CONTROL › Contas (só o Dono): criar contas, senha nova, o cadastro e o ZERAR CONTAS
});

export type AppRouter = typeof appRouter;
