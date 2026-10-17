// ============================================================================
// RACHA 2.0 — Router de perfil, carreira, inventário, conquistas, estatísticas
// ============================================================================
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, desc, or, like, ne } from "drizzle-orm";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import {
  usuarios,
  selos,
  itensUsuario,
  conquistasUsuario,
  estatisticas,
  historicoNiveis,
  recompensasUsuario,
} from "@db/schema";
import { autenticado, exigeLimite, ipDaRequisicao, type CtxAutenticado } from "./guard";
import { paraPublico } from "./authRouter";
import {
  itemPorCodigo,
  formatarIdPublico,
  tituloPorNivel,
  progressoNivel,
  xpTotalParaNivel,
  NIVEL_MAX,
  FAIXAS_TITULO,
  RECOMPENSAS_MARCO,
  MOLDURAS_NIVEL,
  CATALOGO_CONQUISTAS,
  type CategoriaItem,
} from "@contracts/racha";

const AVATARES = ["⚽", "🔥", "⭐", "🎯", "👟", "🧤", "🏆", "🎮", "🦁", "🐆", "🦅", "🐺", "⚡", "🌟", "💪", "🎩"];

async function selosDe(usuarioId: number): Promise<string[]> {
  const lista = await getDb().query.selos.findMany({ where: eq(selos.usuarioId, usuarioId) });
  return lista.map((s) => s.selo);
}

// Busca usuário por ID público ("000123" ou 123) ou username
async function acharUsuario(termo: string) {
  const db = getDb();
  const limpo = termo.trim();
  const num = /^0*\d{1,9}$/.test(limpo) ? Number(limpo) : null;
  if (num !== null && num > 0) {
    const porId = await db.query.usuarios.findFirst({ where: eq(usuarios.idPublico, num) });
    if (porId) return porId;
  }
  return db.query.usuarios.findFirst({ where: eq(usuarios.username, limpo.toLowerCase()) });
}

async function emblemasFavoritos(usuarioId: number) {
  const favs = await getDb().query.conquistasUsuario.findMany({
    where: and(eq(conquistasUsuario.usuarioId, usuarioId), eq(conquistasUsuario.favorita, true)),
    limit: 3,
  });
  return favs
    .map((f) => CATALOGO_CONQUISTAS.find((c) => c.codigo === f.codigo))
    .filter(Boolean)
    .map((c) => ({ codigo: c!.codigo, nome: c!.nome, emoji: c!.emoji }));
}

// Monta o CARTÃO DO RACHA completo de um jogador
async function cartao(u: typeof usuarios.$inferSelect) {
  const db = getDb();
  const [st, conquistas, listaSelos] = await Promise.all([
    db.query.estatisticas.findFirst({ where: eq(estatisticas.usuarioId, u.id) }),
    db.query.conquistasUsuario.findMany({ where: eq(conquistasUsuario.usuarioId, u.id) }),
    selosDe(u.id),
  ]);
  const prog = progressoNivel(u.xp);
  return {
    ...paraPublico(u, listaSelos),
    xp: u.xp,
    progresso: prog,
    proximaRecompensa: proximaRecompensa(u.nivel),
    conquistasFavoritas: await emblemasFavoritos(u.id),
    totalConquistas: conquistas.length,
    stats: st
      ? {
          partidas: st.partidas, vitorias: st.vitorias, derrotas: st.derrotas, empates: st.empates,
          gols: st.gols, assistencias: st.assistencias, defesas: st.defesas, dribles: st.dribles,
          fintas: st.fintas, golsGinga: st.golsGinga, golsTreino: st.golsTreino,
          sequenciaVitorias: st.sequenciaVitorias, melhorSequencia: st.melhorSequencia,
          aproveitamento: st.partidas > 0 ? Math.round((st.vitorias / st.partidas) * 100) : 0,
          mediaGols: st.partidas > 0 ? Math.round((st.gols / st.partidas) * 100) / 100 : 0,
          modoFavorito: Object.entries(st.modos ?? {}).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
        }
      : null,
  };
}

async function emblemasDe(usuarioId: number) {
  const itens = await getDb().query.itensUsuario.findMany({ where: eq(itensUsuario.usuarioId, usuarioId) });
  return itens
    .filter((i) => i.codigoItem.startsWith("emb_") || i.codigoItem.startsWith("emblema_"))
    .map((i) => {
      const cat = itemPorCodigo(i.codigoItem);
      const conquista = CATALOGO_CONQUISTAS.find((c) => `emb_${c.codigo}` === i.codigoItem);
      return {
        codigo: i.codigoItem,
        nome: cat?.nome ?? conquista?.nome ?? i.codigoItem,
        emoji: cat?.visual.emoji ?? conquista?.emoji ?? "🏅",
        obtidoEm: i.obtidoEm,
        origem: i.origemDetalhe ?? i.origem,
      };
    });
}

function proximaRecompensa(nivelAtual: number) {
  const todos = [...RECOMPENSAS_MARCO, ...MOLDURAS_NIVEL].sort((a, b) => a.nivel - b.nivel);
  const prox = todos.find((m) => m.nivel > nivelAtual);
  if (!prox) return null;
  const item = itemPorCodigo(prox.item);
  return { nivel: prox.nivel, item: item ? { codigo: item.codigo, nome: item.nome, categoria: item.categoria, visual: item.visual } : null };
}

export const perfilRouter = createRouter({
  // ---------- 4. MEU CARTÃO ----------
  meuCartao: autenticado.query(async ({ ctx }) => {
    const c = ctx as unknown as CtxAutenticado;
    const cartaoCompleto = await cartao(c.usuario);
    const emblemas = await emblemasDe(c.usuario.id);
    return { ...cartaoCompleto, emblemas };
  }),

  // ---------- 4.1. Editar meu perfil (servidor valida posse dos itens) ----------
  editarPerfil: autenticado
    .input(
      z.object({
        nomeExibicao: z.string().trim().min(2).max(32).optional(),
        avatarEmoji: z.string().max(16).optional(),
        corDestaque: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
        skinEquipada: z.string().max(40).optional(),
        bannerEquipado: z.string().max(40).optional(),
        molduraEquipada: z.string().max(40).nullable().optional(),
        tituloEquipado: z.string().max(60).nullable().optional(),
        perfilPublico: z.boolean().optional(),
        aceitaPedidos: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const c = ctx as unknown as CtxAutenticado;
      const db = getDb();
      const updates: Partial<typeof usuarios.$inferInsert> = {};

      if (input.nomeExibicao) updates.nomeExibicao = input.nomeExibicao;
      if (input.corDestaque) updates.corDestaque = input.corDestaque;
      if (input.perfilPublico !== undefined) updates.perfilPublico = input.perfilPublico;
      if (input.aceitaPedidos !== undefined) updates.aceitaPedidos = input.aceitaPedidos;
      if (input.avatarEmoji) {
        if (!AVATARES.includes(input.avatarEmoji)) throw new TRPCError({ code: "BAD_REQUEST", message: "Avatar inválido." });
        updates.avatarEmoji = input.avatarEmoji;
      }

      // Itens equipados: o servidor confere se a conta REALMENTE possui
      const possui = async (codigo: string) => {
        if (codigo === "skin_padrao" || codigo === "banner_laje_noturna") return true;
        const item = await db.query.itensUsuario.findFirst({
          where: and(eq(itensUsuario.usuarioId, c.usuario.id), eq(itensUsuario.codigoItem, codigo)),
        });
        return !!item;
      };
      if (input.skinEquipada !== undefined) {
        const item = itemPorCodigo(input.skinEquipada);
        if (!item || item.categoria !== "skin" || !(await possui(input.skinEquipada))) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Você não possui essa skin." });
        }
        updates.skinEquipada = input.skinEquipada;
      }
      if (input.bannerEquipado !== undefined) {
        const item = itemPorCodigo(input.bannerEquipado);
        if (!item || item.categoria !== "banner" || !(await possui(input.bannerEquipado))) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Você não possui esse banner." });
        }
        updates.bannerEquipado = input.bannerEquipado;
      }
      if (input.molduraEquipada !== undefined) {
        if (input.molduraEquipada === null) updates.molduraEquipada = null;
        else {
          const item = itemPorCodigo(input.molduraEquipada);
          if (!item || item.categoria !== "moldura" || !(await possui(input.molduraEquipada))) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Você não possui essa moldura." });
          }
          updates.molduraEquipada = input.molduraEquipada;
        }
      }
      if (input.tituloEquipado !== undefined) {
        if (input.tituloEquipado === null) updates.tituloEquipado = null;
        else {
          // Títulos válidos: faixa de carreira já alcançada ou título-item possuído
          const nivelOk = FAIXAS_TITULO.some((f) => f.titulo === input.tituloEquipado && c.usuario.nivel >= f.min);
          const itemTitulo = itemPorCodigo(input.tituloEquipado.startsWith("titulo_") ? input.tituloEquipado : "");
          const possuiTituloItem = itemTitulo ? await possui(itemTitulo.codigo) : false;
          const nomeDeItemPossuido = itemTitulo?.nome === input.tituloEquipado && possuiTituloItem;
          if (!nivelOk && !nomeDeItemPossuido) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Você ainda não desbloqueou esse título." });
          }
          updates.tituloEquipado = input.tituloEquipado;
        }
      }

      if (Object.keys(updates).length === 0) return { ok: true };
      await db.update(usuarios).set(updates).where(eq(usuarios.id, c.usuario.id));
      return { ok: true };
    }),

  // ---------- 4.2. Perfil público de outro jogador (só dados públicos) ----------
  perfilPublico: publicQuery
    .input(z.object({ termo: z.string().trim().min(1).max(40) }))
    .query(async ({ ctx, input }) => {
      // Limitação de buscas: evita varredura automatizada de IDs
      const s = ctx as unknown as { req: Request };
      await exigeLimite(`busca:${ipDaRequisicao(s.req)}`, 30, 60 * 1000, "Muitas buscas. Aguarde um minuto.");

      const u = await acharUsuario(input.termo);
      if (!u) throw new TRPCError({ code: "NOT_FOUND", message: "Jogador não encontrado." });
      if (!u.perfilPublico) {
        // Perfil privado: só o mínimo (nada de stats/email/dados administrativos)
        return {
          privado: true as const,
          ...paraPublico(u, await selosDe(u.id)),
          progresso: null, stats: null, emblemas: [], conquistasFavoritas: [], totalConquistas: 0,
        };
      }
      const cartaoCompleto = await cartao(u);
      const emblemas = await emblemasDe(u.id);
      return { privado: false as const, ...cartaoCompleto, emblemas };
    }),

  // ---------- 5. JORNADA DE CARREIRA (tela completa 1→100) ----------
  carreira: autenticado.query(async ({ ctx }) => {
    const c = ctx as unknown as CtxAutenticado;
    const db = getDb();
    const historico = await db.query.historicoNiveis.findMany({
      where: eq(historicoNiveis.usuarioId, c.usuario.id),
      orderBy: [desc(historicoNiveis.nivel)],
      limit: 50,
    });
    const marcos = [...RECOMPENSAS_MARCO, ...MOLDURAS_NIVEL]
      .sort((a, b) => a.nivel - b.nivel)
      .map((m) => {
        const item = itemPorCodigo(m.item)!;
        return { nivel: m.nivel, item, alcancado: c.usuario.nivel >= m.nivel };
      });
    return {
      nivel: c.usuario.nivel,
      xp: c.usuario.xp,
      progresso: progressoNivel(c.usuario.xp),
      tituloAtual: tituloPorNivel(c.usuario.nivel),
      faixas: FAIXAS_TITULO.map((f) => ({
        ...f,
        xpNecessario: xpTotalParaNivel(f.min),
        alcancada: c.usuario.nivel >= f.min,
        atual: c.usuario.nivel >= f.min && c.usuario.nivel <= f.max,
      })),
      marcos,
      proximaRecompensa: proximaRecompensa(c.usuario.nivel),
      historico: historico.map((h) => ({ nivel: h.nivel, quando: h.criadoEm })),
      nivelMax: NIVEL_MAX,
    };
  }),

  // ---------- 6. MINHA CARREIRA (estatísticas confiáveis) ----------
  minhasEstatisticas: autenticado.query(async ({ ctx }) => {
    const c = ctx as unknown as CtxAutenticado;
    const db = getDb();
    const st = await db.query.estatisticas.findFirst({ where: eq(estatisticas.usuarioId, c.usuario.id) });
    if (!st) return null;
    return {
      partidas: st.partidas, vitorias: st.vitorias, derrotas: st.derrotas, empates: st.empates,
      gols: st.gols, assistencias: st.assistencias, defesas: st.defesas, dribles: st.dribles,
      fintas: st.fintas, golsGinga: st.golsGinga, golsTreino: st.golsTreino,
      sequenciaVitorias: st.sequenciaVitorias, melhorSequencia: st.melhorSequencia,
      aproveitamento: st.partidas > 0 ? Math.round((st.vitorias / st.partidas) * 100) : 0,
      mediaGols: st.partidas > 0 ? Math.round((st.gols / st.partidas) * 100) / 100 : 0,
      modos: st.modos ?? {},
      modoFavorito: Object.entries(st.modos ?? {}).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
      nota: "Somente eventos validados pelo servidor contam. Nada aqui é preenchido pelo navegador.",
    };
  }),

  // ---------- 7. CONQUISTAS ----------
  minhasConquistas: autenticado.query(async ({ ctx }) => {
    const c = ctx as unknown as CtxAutenticado;
    const db = getDb();
    const minhas = await db.query.conquistasUsuario.findMany({ where: eq(conquistasUsuario.usuarioId, c.usuario.id) });
    const mapa = new Map(minhas.map((m) => [m.codigo, m]));
    const st = await db.query.estatisticas.findFirst({ where: eq(estatisticas.usuarioId, c.usuario.id) });
    const valor = (m: string): number => {
      if (!st) return 0;
      switch (m) {
        case "partidas": return st.partidas;
        case "gols": return st.gols;
        case "assistencias": return st.assistencias;
        case "golsGinga": return st.golsGinga;
        case "melhorSequencia": return st.melhorSequencia;
        case "nivel": return c.usuario.nivel;
        default: return 0;
      }
    };
    return CATALOGO_CONQUISTAS.map((cat) => {
      const minha = mapa.get(cat.codigo);
      return {
        ...cat,
        desbloqueada: !!minha,
        favorita: minha?.favorita ?? false,
        desbloqueadaEm: minha?.desbloqueadaEm ?? null,
        progresso: Math.min(valor(cat.metrica), cat.marco),
      };
    });
  }),

  // Destacar até 3 conquistas no perfil
  favoritarConquista: autenticado
    .input(z.object({ codigo: z.string().max(40), favorita: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const c = ctx as unknown as CtxAutenticado;
      const db = getDb();
      const minha = await db.query.conquistasUsuario.findFirst({
        where: and(eq(conquistasUsuario.usuarioId, c.usuario.id), eq(conquistasUsuario.codigo, input.codigo)),
      });
      if (!minha) throw new TRPCError({ code: "NOT_FOUND", message: "Conquista ainda não desbloqueada." });
      if (input.favorita) {
        const favs = await db.query.conquistasUsuario.findMany({
          where: and(eq(conquistasUsuario.usuarioId, c.usuario.id), eq(conquistasUsuario.favorita, true)),
        });
        if (favs.length >= 3) throw new TRPCError({ code: "BAD_REQUEST", message: "Máximo de 3 conquistas em destaque." });
      }
      await db
        .update(conquistasUsuario)
        .set({ favorita: input.favorita })
        .where(eq(conquistasUsuario.id, minha.id));
      return { ok: true };
    }),

  // ---------- 13. INVENTÁRIO ----------
  meuInventario: autenticado.query(async ({ ctx }) => {
    const c = ctx as unknown as CtxAutenticado;
    const db = getDb();
    const itens = await db.query.itensUsuario.findMany({
      where: eq(itensUsuario.usuarioId, c.usuario.id),
      orderBy: [desc(itensUsuario.obtidoEm)],
    });
    return itens.map((i) => {
      const cat = itemPorCodigo(i.codigoItem);
      const conquista = CATALOGO_CONQUISTAS.find((x) => `emb_${x.codigo}` === i.codigoItem);
      const categoria: CategoriaItem | "emblema" =
        cat?.categoria ?? (i.codigoItem.startsWith("emb_") ? "emblema" : "efeito");
      return {
        codigo: i.codigoItem,
        nome: cat?.nome ?? conquista?.nome ?? i.codigoItem,
        categoria,
        raridade: cat?.raridade ?? "raro",
        visual: cat?.visual ?? { emoji: conquista?.emoji ?? "🏅", cores: ["#7048e8", "#ffd23f"] as [string, string] },
        origem: i.origem,
        origemDetalhe: i.origemDetalhe,
        obtidoEm: i.obtidoEm,
        equipado:
          c.usuario.skinEquipada === i.codigoItem ||
          c.usuario.bannerEquipado === i.codigoItem ||
          c.usuario.molduraEquipada === i.codigoItem,
      };
    });
  }),

  // ---------- Histórico de recompensas ----------
  minhasRecompensas: autenticado.query(async ({ ctx }) => {
    const c = ctx as unknown as CtxAutenticado;
    const lista = await getDb().query.recompensasUsuario.findMany({
      where: eq(recompensasUsuario.usuarioId, c.usuario.id),
      orderBy: [desc(recompensasUsuario.criadoEm)],
      limit: 50,
    });
    return lista.map((r) => {
      const cat = itemPorCodigo(r.codigoItem);
      const conquista = CATALOGO_CONQUISTAS.find((x) => `emb_${x.codigo}` === r.codigoItem);
      return {
        codigo: r.codigoItem,
        nome: cat?.nome ?? conquista?.nome ?? r.codigoItem,
        emoji: cat?.visual.emoji ?? conquista?.emoji ?? "🎁",
        origem: r.origem,
        quando: r.criadoEm,
      };
    });
  }),

  // ---------- RANKING (nível, gols, vitórias) ----------
  ranking: publicQuery
    .input(z.object({ tipo: z.enum(["nivel", "gols", "vitorias"]).default("nivel") }))
    .query(async ({ input }) => {
      const db = getDb();
      const base = await db
        .select({
          id: usuarios.id,
          idPublico: usuarios.idPublico,
          nomeExibicao: usuarios.nomeExibicao,
          nivel: usuarios.nivel,
          xp: usuarios.xp,
          avatarEmoji: usuarios.avatarEmoji,
          molduraEquipada: usuarios.molduraEquipada,
          gols: estatisticas.gols,
          vitorias: estatisticas.vitorias,
          partidas: estatisticas.partidas,
        })
        .from(usuarios)
        .leftJoin(estatisticas, eq(estatisticas.usuarioId, usuarios.id))
        .where(and(eq(usuarios.perfilPublico, true), ne(usuarios.estado, "banido")))
        .orderBy(
          input.tipo === "nivel"
            ? desc(usuarios.xp)
            : input.tipo === "gols"
              ? desc(estatisticas.gols)
              : desc(estatisticas.vitorias),
        )
        .limit(50);
      const comSelos = await Promise.all(
        base.map(async (u, i) => ({
          posicao: i + 1,
          idPublico: formatarIdPublico(Number(u.idPublico)),
          nomeExibicao: u.nomeExibicao,
          nivel: u.nivel,
          titulo: tituloPorNivel(u.nivel),
          avatarEmoji: u.avatarEmoji,
          molduraEquipada: u.molduraEquipada,
          gols: u.gols ?? 0,
          vitorias: u.vitorias ?? 0,
          partidas: u.partidas ?? 0,
          selos: await selosDe(u.id),
        })),
      );
      return comSelos;
    }),

  // Busca rápida de jogadores (para amigos/admin) — com rate limit anti-varredura
  buscarJogadores: autenticado
    .input(z.object({ termo: z.string().trim().min(1).max(40) }))
    .query(async ({ ctx, input }) => {
      const c = ctx as unknown as CtxAutenticado;
      await exigeLimite(`busca:${c.usuario.id}`, 20, 60 * 1000, "Muitas buscas. Aguarde um minuto.");
      const db = getDb();
      const termo = input.termo.trim();
      const num = /^0*\d{1,9}$/.test(termo) ? Number(termo) : null;

      let achados: (typeof usuarios.$inferSelect)[] = [];
      if (num !== null && num > 0) {
        const porId = await db.query.usuarios.findFirst({ where: eq(usuarios.idPublico, num) });
        if (porId) achados = [porId];
      }
      if (achados.length === 0) {
        achados = await db.query.usuarios.findMany({
          where: or(like(usuarios.username, `${termo.toLowerCase()}%`), like(usuarios.nomeExibicao, `${termo}%`)),
          limit: 10,
        });
      }
      return Promise.all(
        achados
          .filter((u) => u.id !== c.usuario.id)
          .map(async (u) => ({
            ...paraPublico(u, await selosDe(u.id)),
          })),
      );
    }),

  avataresDisponiveis: publicQuery.query(() => AVATARES),
});
