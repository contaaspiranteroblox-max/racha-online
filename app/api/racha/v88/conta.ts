// ============================================================================
// RACHA v88 — EXCLUIR A CONTA (Ajustes › Conta). Pede a senha e a palavra EXCLUIR. Apaga os dados pessoais (nome, e-mail,
// senha, bio, tampinha, a cópia do progresso, as mensagens e as cartas), desfaz amizades, pedidos e bloqueios, tira do
// clube (o dono passa o clube adiante, como no SAIR), encerra todas as sessões e deixa a conta marcada como excluída.
// O ID público não volta a ser usado. O histórico que a equipe precisa para auditoria (partidas, movimentações da carteira,
// denúncias) fica, sem os dados pessoais (só o número interno).
// ============================================================================
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, or, isNull, desc } from "drizzle-orm";
import { createRouter } from "../../middleware";
import { getDb } from "../../queries/connection";
import { usuarios, amizades, pedidosAmizade, bloqueios, sessoes, clubeMembros, clubes, progressoJogo, mensagens, correio, clubeConvites, clubePedidos, estatisticas, totp } from "@db/schema";
import { autenticado, exigeLimite } from "../guard";
import { verificarSenha, novoToken, hashSenha } from "../security";
import { contaDe, empurraRelacoes, idsAmigos } from "./comum";

export const contaRouter = createRouter({
  excluir: autenticado
    .input(z.object({ senha: z.string().min(1).max(100), confirmacao: z.literal("EXCLUIR") }))
    .mutation(async ({ ctx, input }) => {
      const u = contaDe(ctx);
      await exigeLimite(`excluir:${u.id}`, 5, 60 * 60 * 1000, "Muitas tentativas. Tente mais tarde.");
      if (!verificarSenha(input.senha, u.senhaHash)) throw new TRPCError({ code: "UNAUTHORIZED", message: "Senha errada." });
      if (u.idPublico === 1) throw new TRPCError({ code: "FORBIDDEN", message: "A conta do Dono não pode ser excluída por aqui." });
      const db = getDb();
      const amigos = await idsAmigos(u.id);
      // o clube: sai (o dono passa para quem tem mais tempo; o último fecha o clube)
      const membro = await db.query.clubeMembros.findFirst({ where: eq(clubeMembros.usuarioId, u.id) });
      if (membro) {
        await db.delete(clubeMembros).where(eq(clubeMembros.usuarioId, u.id));
        if (membro.papel === "dono") {
          const resto = await db.query.clubeMembros.findMany({ where: eq(clubeMembros.clubeId, membro.clubeId), orderBy: [desc(clubeMembros.entrouEm)] });
          const proximo = resto.find((m) => m.papel === "admin") || resto[resto.length - 1];
          if (proximo) {
            await db.update(clubeMembros).set({ papel: "dono" }).where(eq(clubeMembros.usuarioId, proximo.usuarioId));
            await db.update(clubes).set({ donoId: proximo.usuarioId }).where(eq(clubes.id, membro.clubeId));
          } else await db.delete(clubes).where(eq(clubes.id, membro.clubeId));
        }
      }
      await db.delete(amizades).where(or(eq(amizades.usuarioId, u.id), eq(amizades.amigoId, u.id)));
      await db.delete(pedidosAmizade).where(or(eq(pedidosAmizade.deId, u.id), eq(pedidosAmizade.paraId, u.id)));
      await db.delete(bloqueios).where(or(eq(bloqueios.usuarioId, u.id), eq(bloqueios.bloqueadoId, u.id)));
      await db.delete(clubeConvites).where(or(eq(clubeConvites.paraId, u.id), eq(clubeConvites.deId, u.id)));
      await db.delete(clubePedidos).where(eq(clubePedidos.usuarioId, u.id));
      await db.delete(progressoJogo).where(eq(progressoJogo.usuarioId, u.id));
      await db.delete(mensagens).where(eq(mensagens.usuarioId, u.id));
      await db.delete(correio).where(eq(correio.usuarioId, u.id));
      await db.delete(totp).where(eq(totp.usuarioId, u.id));
      await db.update(sessoes).set({ revogadaEm: new Date() }).where(and(eq(sessoes.usuarioId, u.id), isNull(sessoes.revogadaEm)));
      await db.update(usuarios).set({
        username: ("excluido_" + u.id).slice(0, 24), nomeExibicao: "Conta excluída", email: null, senhaHash: hashSenha(novoToken()),
        codigoRecuperacaoHash: null, tampa: null, bio: null, equipados: null, perfilPublico: false, aceitaPedidos: false,
        mostraOnline: false, aceitaConvites: false, tituloEquipado: null, excluidoEm: new Date(),
      }).where(eq(usuarios.id, u.id));
      await db.update(estatisticas).set({ atualizadoEm: new Date() }).where(eq(estatisticas.usuarioId, u.id));
      await empurraRelacoes(...amigos);
      ctx.resHeaders?.append?.("Set-Cookie", "racha_sessao=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax");
      return { ok: true };
    }),
});
