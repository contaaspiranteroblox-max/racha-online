// ============================================================================
// RACHA 2.0 — Router de jogo: tokens de partida, resultado validado, treino
//
// HONESTIDADE (seção 16 do design): a simulação física roda no navegador, então
// o servidor NÃO pode provar cada toque na bola. O que ele faz:
//   · emite um token de partida de uso único e com validade;
//   · deduplica por matchId (mesmo resultado nunca rende duas vezes);
//   · valida plausibilidade (duração, placar, gols dentro do ritmo do jogo);
//   · recalcula o resultado a partir do placar (não confia no campo "resultado");
//   · aplica tetos de XP por partida e por dia (anti-farm);
//   · rejeita qualquer pedido de "adicionar XP" direto — esse endpoint NÃO EXISTE.
// Por isso rankings competitivos importantes devem, no futuro, esperar partidas
// com validação servidor-a-servidor (online autoritativo).
// v70: a partida ONLINE (sala do servidor da turma) só rende com o SELO do servidor: ele conferiu o resultado
// (mandado pelo anfitrião, da rodada certa, placar igual ao dos quadros, placar e tempo possíveis) e assinou
// para esta conta; aqui o selo é conferido (assinatura, conta, lado, placar, modo, validade) e usado uma vez só.
// v82: A PATENTE NA CONTA. A partida diz no começo se é da ranqueada (contra os bots ou online) e o tamanho do time; no
// fim, o servidor faz a conta dos pontos (contracts/patentes.ts, as regras do jogo) e guarda na conta (ranqueada.ts):
// online, só com o selo que diz "ranqueada" e o mesmo tamanho; contra os bots, com o teto do dia; a desistência tira 25.
// A resposta leva a patente nova (o jogo acerta a tela do fim e a cópia dele pelo que vem daqui).
// A ranqueada que passa da validade (30 min) sem o fim — o jogo fechou, a rede caiu no meio — conta como desistência: na
// próxima partida que a conta começar (iniciarPartida) ou se o fim chegar depois da validade (encerrarPartida). Sem isso,
// fechar o jogo no meio de uma derrota livrava a patente. (Só as vencidas: o fim de uma partida recente ainda pode chegar.)
// ============================================================================
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, desc, lt } from "drizzle-orm";
import { createRouter } from "../middleware";
import { getDb } from "../queries/connection";
import { partidas, xpDiario, estatisticas, selos } from "@db/schema";
import { autenticado, exigeLimite, bateLimite, type CtxAutenticado } from "./guard";
import { novoToken, sha256 } from "./security";
import { concederXp, aplicarEstatisticasPartida, verificarConquistas } from "./progressao";
import { XP, formatarIdPublico } from "@contracts/racha";
import { bilheteDaConta, confereSelo } from "../lib/selo";
import { aplicaRanqueada, type RespostaRanqueada } from "./ranqueada";
import { motivoResultadoOnline, acaoRanqueada } from "@contracts/partida";

const MODOS = ["futebol", "curva", "ginga", "volei", "americano", "basquete"];
const NIVEIS_BOT = ["facil", "medio", "dificil", "lenda"];

const VALIDADE_PARTIDA_MS = 30 * 60 * 1000; // o token de partida vale 30 min

function hojeUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

async function xpDiarioDe(usuarioId: number) {
  const db = getDb();
  const dia = hojeUTC();
  let row = await db.query.xpDiario.findFirst({ where: and(eq(xpDiario.usuarioId, usuarioId), eq(xpDiario.dia, dia)) });
  if (!row) {
    await db.insert(xpDiario).values({ usuarioId, dia }).onDuplicateKeyUpdate({ set: { usuarioId } });
    row = await db.query.xpDiario.findFirst({ where: and(eq(xpDiario.usuarioId, usuarioId), eq(xpDiario.dia, dia)) });
  }
  return row!;
}

// v82: a ranqueada aberta que não vai mais ter fim (passou da validade): desistência, uma vez (a referência é o matchId)
type PartidaGuardada = { id: string; online: boolean | null; nivelBots: string | null; tamanho: number | null };
async function desistenciaDe(usuarioId: number, a: PartidaGuardada): Promise<RespostaRanqueada> {
  const r = await aplicaRanqueada(
    usuarioId,
    a.id,
    { placarNosso: 0, placarDeles: 0, abandono: true, contraBots: !a.online, nivelBots: a.nivelBots },
    { online: !!a.online, tamanho: a.tamanho ?? null },
  );
  await getDb()
    .update(partidas)
    .set({ estado: "encerrada", encerradaEm: new Date(), xpConcedido: 0, rqDelta: r.delta })
    .where(and(eq(partidas.id, a.id), eq(partidas.estado, "aberta")));
  return r;
}
async function fechaRanqueadasVencidas(usuarioId: number): Promise<{ n: number; rq: RespostaRanqueada | null }> {
  const vencidas = await getDb().query.partidas.findMany({
    where: and(
      eq(partidas.usuarioId, usuarioId),
      eq(partidas.estado, "aberta"),
      eq(partidas.ranqueada, true),
      lt(partidas.criadaEm, new Date(Date.now() - VALIDADE_PARTIDA_MS)),
    ),
    limit: 10,
  });
  let n = 0;
  let rq: RespostaRanqueada | null = null;
  for (const a of vencidas) {
    const r = await desistenciaDe(usuarioId, a);
    if (!r.duplicada) n++;
    rq = r;
  }
  return { n, rq };
}

export const jogoRouter = createRouter({
  // ---------- v70: o bilhete da conta para o servidor da turma (as salas online reconhecem quem é quem) ----------
  bilheteSala: autenticado.mutation(async ({ ctx }) => {
    const c = ctx as unknown as CtxAutenticado;
    await exigeLimite(`bilhete:${c.usuario.id}`, 30, 60 * 60 * 1000, "Muitos pedidos seguidos.");
    const meus = await getDb().query.selos.findMany({ where: eq(selos.usuarioId, c.usuario.id) });   // v79: os selos vão assinados no bilhete
    return { bilhete: bilheteDaConta(Number(c.usuario.idPublico), c.usuario.nomeExibicao, meus.map((x) => x.selo)) };
  }),

  // ---------- Início de partida: emite token de uso único (válido 30 min) ----------
  iniciarPartida: autenticado
    .input(
      z.object({
        matchId: z.string().uuid("matchId inválido"),
        modo: z.enum(MODOS as [string, ...string[]]),
        mapa: z.string().max(30).optional(),
        nivelBots: z.enum(NIVEIS_BOT as [string, ...string[]]).optional(),
        // v82: a ranqueada (a patente da conta), online ou contra os bots, e o tamanho do time
        ranqueada: z.boolean().default(false),
        online: z.boolean().default(false),
        tamanho: z.number().int().min(1).max(4).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const c = ctx as unknown as CtxAutenticado;
      await exigeLimite(`partida:${c.usuario.id}`, 30, 10 * 60 * 1000, "Calma, craque! Muitas partidas seguidas.");
      const db = getDb();

      const existente = await db.query.partidas.findFirst({ where: eq(partidas.id, input.matchId) });
      if (existente) throw new TRPCError({ code: "CONFLICT", message: "Essa partida já foi registrada." });

      // v82: a ranqueada de antes que ficou aberta e venceu conta como desistência (a resposta leva a patente nova)
      const vencidas = await fechaRanqueadasVencidas(c.usuario.id);

      const token = novoToken();
      await db.insert(partidas).values({
        id: input.matchId,
        usuarioId: c.usuario.id,
        tokenHash: sha256(token),
        modo: input.modo,
        mapa: input.mapa ?? null,
        nivelBots: input.nivelBots ?? null,
        ranqueada: input.ranqueada,
        online: input.online,
        tamanho: input.tamanho ?? null,
      });
      return { matchToken: token, expiraEmSeg: VALIDADE_PARTIDA_MS / 1000, desistencias: vencidas.n, rq: vencidas.n ? vencidas.rq : null };
    }),

  // ---------- Fim de partida: valida e concede XP/estatísticas UMA vez ----------
  encerrarPartida: autenticado
    .input(
      z.object({
        matchId: z.string().uuid(),
        matchToken: z.string().min(20).max(100),
        placarNosso: z.number().int().min(0).max(XP.PLACAR_MAX),
        placarDeles: z.number().int().min(0).max(XP.PLACAR_MAX),
        gols: z.number().int().min(0).max(XP.PLACAR_MAX),
        assistencias: z.number().int().min(0).max(XP.PLACAR_MAX),
        golsGinga: z.number().int().min(0).max(XP.PLACAR_MAX).default(0),
        duracaoSeg: z.number().int().min(0).max(XP.PARTIDA_MAX_SEG),
        abandonada: z.boolean().default(false),
        // v70: a classificação do placar e a partida online (com o selo do servidor da turma)
        modo: z.enum(MODOS as [string, ...string[]]).optional(),
        pontos: z.number().int().min(0).max(XP.PLACAR_MAX * 3).default(0),
        golsContra: z.number().int().min(0).max(XP.PLACAR_MAX).default(0),
        online: z.boolean().default(false),
        valida: z.boolean().default(true),
        selo: z.string().max(600).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const c = ctx as unknown as CtxAutenticado;
      const db = getDb();

      const p = await db.query.partidas.findFirst({ where: eq(partidas.id, input.matchId) });
      if (!p) throw new TRPCError({ code: "NOT_FOUND", message: "Partida não encontrada." });
      if (p.usuarioId !== c.usuario.id) throw new TRPCError({ code: "FORBIDDEN", message: "Essa partida não é sua." });
      if (p.tokenHash !== sha256(input.matchToken)) throw new TRPCError({ code: "FORBIDDEN", message: "Token de partida inválido." });
      if (p.estado === "encerrada") {
        // Envio duplicado: devolve o que já foi concedido, sem recompensar de novo
        return { ok: true as const, duplicada: true as const, xpConcedido: 0, motivo: "Partida já contabilizada.", rq: null };
      }
      if (Date.now() - p.criadaEm.getTime() > VALIDADE_PARTIDA_MS) {
        // v82: a ranqueada vencida não tem mais resultado: desistência (a mesma de quando a próxima partida começa)
        if (p.ranqueada) {
          const r = await desistenciaDe(c.usuario.id, p);
          return { ok: true as const, duplicada: false as const, xpConcedido: 0, motivo: "Essa partida expirou: na ranqueada, conta como desistência (" + r.delta + " pontos).", rq: r };
        }
        throw new TRPCError({ code: "BAD_REQUEST", message: "Essa partida expirou." });
      }

      // v70: o modo da partida é o do começo (o fim não troca)
      if (input.modo && input.modo !== p.modo) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "O modo do fim não bate com o do começo." });
      }
      // v82: a ranqueada é a do começo (o fim não troca): online × contra os bots e o tamanho também
      const rq = !!p.ranqueada;
      const partidaRq = (abandono: boolean) => ({
        placarNosso: input.placarNosso,
        placarDeles: input.placarDeles,
        abandono,
        contraBots: !p.online,
        nivelBots: p.nivelBots,
      });
      const extraRq = { online: !!p.online, tamanho: p.tamanho ?? null };
      const acaoFim = (motivoOnline: string) =>
        acaoRanqueada({ ranqueada: rq, online: !!p.online, fimOnline: input.online, abandonada: input.abandonada, valida: input.valida, motivoOnline });
      if (acaoFim("") === "mudou") {
        await db.update(partidas).set({ estado: "encerrada", encerradaEm: new Date(), xpConcedido: 0 }).where(eq(partidas.id, p.id));
        return { ok: true as const, duplicada: false as const, xpConcedido: 0, motivo: "A partida mudou de tipo no meio (online × contra os bots).", rq: null };
      }

      // v70: partida online sem o selo do servidor da turma (ou que ele não validou) não rende: não dá para conferir
      // (v82: as regras em contracts/partida.ts; na ranqueada, o selo precisa dizer "ranqueada" e o mesmo tamanho)
      if (input.online && !input.abandonada) {
        const selo = input.valida ? confereSelo(input.selo) : null;
        const motivo = motivoResultadoOnline(selo, {
          valida: input.valida,
          idPublico: formatarIdPublico(Number(c.usuario.idPublico)),
          placarNosso: input.placarNosso,
          placarDeles: input.placarDeles,
          modo: p.modo,
          ranqueada: rq,
          tamanho: p.tamanho ?? null,
          agora: Date.now(),
        });
        if (motivo || (selo && (await bateLimite(`selo:${sha256(input.selo ?? "")}`, 1, 45 * 60 * 1000)))) {
          await db.update(partidas).set({ estado: "encerrada", encerradaEm: new Date(), xpConcedido: 0 }).where(eq(partidas.id, p.id));
          return { ok: true as const, duplicada: false as const, xpConcedido: 0, motivo: motivo || "Esse resultado online já foi usado.", rq: null };
        }
        input.duracaoSeg = Math.max(input.duracaoSeg, Math.min(XP.PARTIDA_MAX_SEG, Math.round(selo!.d)));   // (o tempo de verdade, medido pelo servidor)
      }

      // Partidas abandonadas não rendem (evita farm de participação) · v82: na ranqueada, a desistência tira 25 da patente
      if (input.abandonada || !input.valida) {
        const rqDes: RespostaRanqueada | null = acaoFim("") === "desistencia" ? await aplicaRanqueada(c.usuario.id, p.id, partidaRq(true), extraRq) : null;
        await db
          .update(partidas)
          .set({ estado: "encerrada", encerradaEm: new Date(), xpConcedido: 0, rqDelta: rqDes ? rqDes.delta : null })
          .where(eq(partidas.id, p.id));
        return {
          ok: true as const,
          duplicada: false as const,
          xpConcedido: 0,
          motivo: input.abandonada ? (rqDes ? "Desistência da ranqueada: " + rqDes.delta + " pontos." : "Partida abandonada não rende XP.") : "O servidor da turma não validou esse resultado.",
          rq: rqDes,
        };
      }

      // ---------- Validações de plausibilidade ----------
      if (input.duracaoSeg < XP.PARTIDA_MIN_SEG) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Partida curta demais para ser válida." });
      }
      if (input.gols > input.placarNosso) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Você não pode ter mais gols que o seu time." });
      }
      // Ritmo máximo: 1 gol a cada ~5 s por lado (o jogo mal consegue isso)
      const ritmoMax = Math.floor(input.duracaoSeg / 5) + 3;
      if (input.placarNosso > ritmoMax || input.placarDeles > ritmoMax) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Placar incompatível com a duração." });
      }
      if (input.golsGinga > input.gols) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Gols de ginga não podem passar dos seus gols." });
      }

      // Resultado recalculado NO SERVIDOR a partir do placar
      const resultado = input.placarNosso > input.placarDeles ? "vitoria" : input.placarNosso < input.placarDeles ? "derrota" : "empate";

      // ---------- Cálculo de XP (regras do servidor, com tetos) ----------
      let xp = XP.PARTICIPACAO + input.gols * XP.GOL + input.assistencias * XP.ASSISTENCIA + input.golsGinga * XP.GOL_GINGA;
      xp += resultado === "vitoria" ? XP.VITORIA : resultado === "empate" ? XP.EMPATE : 0;
      xp = Math.min(xp, XP.MAX_POR_PARTIDA);

      // Teto diário anti-farm
      const hoje = await xpDiarioDe(c.usuario.id);
      const restanteHoje = Math.max(0, XP.MAX_DIARIO_PARTIDAS - hoje.xpPartidas);
      xp = Math.min(xp, restanteHoje);

      // Aplica tudo atomicamente em espírito: stats → XP (com dedup por matchId) → conquistas
      await aplicarEstatisticasPartida(c.usuario.id, {
        resultado,
        gols: input.gols,
        assistencias: input.assistencias,
        golsGinga: input.golsGinga,
        modo: p.modo,
      });
      const prog = await concederXp(c.usuario.id, xp, `partida:${p.modo}`, p.id);
      await db
        .update(xpDiario)
        .set({ xpPartidas: hoje.xpPartidas + prog.xpConcedido })
        .where(and(eq(xpDiario.usuarioId, c.usuario.id), eq(xpDiario.dia, hojeUTC())));
      const conquistasNovas = await verificarConquistas(c.usuario.id);
      // v82: a patente (depois do XP: se algo acima falhar, a partida não mexe na patente)
      const rqRes: RespostaRanqueada | null = acaoFim("") === "partida" ? await aplicaRanqueada(c.usuario.id, p.id, partidaRq(false), extraRq) : null;
      await db
        .update(partidas)
        .set({
          estado: "encerrada",
          placarNosso: input.placarNosso,
          placarDeles: input.placarDeles,
          resultado,
          gols: input.gols,
          assistencias: input.assistencias,
          golsGinga: input.golsGinga,
          duracaoSeg: input.duracaoSeg,
          xpConcedido: prog.xpConcedido,
          pontos: input.pontos,
          golsContra: input.golsContra,
          rqDelta: rqRes ? rqRes.delta : null,
          encerradaEm: new Date(),
        })
        .where(eq(partidas.id, p.id));

      return {
        ok: true as const,
        duplicada: false as const,
        resultado,
        xpConcedido: prog.xpConcedido,
        xpTotal: prog.xpTotal,
        nivel: prog.nivelDepois,
        subiuNivel: prog.subiuNivel,
        titulo: prog.titulo,
        itensNovos: prog.itensNovos,
        conquistasNovas: [...new Set([...prog.conquistasNovas, ...conquistasNovas])],
        tetoDiarioAtingido: restanteHoje === 0,
        rq: rqRes, // v82: a patente depois desta partida (null fora da ranqueada)
      };
    }),

  // ---------- Gols de treino (livre/exercícios): teto diário, espelha o jogo ----------
  golTreino: autenticado
    .input(z.object({ quantidade: z.number().int().min(1).max(3), origem: z.enum(["livre", "treino"]) }))
    .mutation(async ({ ctx, input }) => {
      const c = ctx as unknown as CtxAutenticado;
      const db = getDb();
      await exigeLimite(`treino:${c.usuario.id}`, 40, 10 * 60 * 1000, "Muitos gols de treino seguidos.");
      const hoje = await xpDiarioDe(c.usuario.id);
      const restante = Math.max(0, XP.TREINO_MAX_DIARIO - hoje.golsTreino);
      const validos = Math.min(input.quantidade, restante);

      await db
        .update(estatisticas)
        .set({ golsTreino: (await db.query.estatisticas.findFirst({ where: eq(estatisticas.usuarioId, c.usuario.id) }))!.golsTreino + input.quantidade, atualizadoEm: new Date() })
        .where(eq(estatisticas.usuarioId, c.usuario.id));
      await db
        .update(xpDiario)
        .set({ golsTreino: hoje.golsTreino + validos })
        .where(and(eq(xpDiario.usuarioId, c.usuario.id), eq(xpDiario.dia, hojeUTC())));

      let prog = null;
      if (validos > 0) {
        prog = await concederXp(c.usuario.id, validos * XP.TREINO_GOL, "treino", `${hojeUTC()}:${hoje.golsTreino}`);
      }
      return {
        ok: true as const,
        validos,
        restanteHoje: XP.TREINO_MAX_DIARIO - hoje.golsTreino - validos,
        xpConcedido: prog?.xpConcedido ?? 0,
        subiuNivel: prog?.subiuNivel ?? false,
        nivel: prog?.nivelDepois,
        itensNovos: prog?.itensNovos ?? [],
        conquistasNovas: prog?.conquistasNovas ?? [],
      };
    }),

  // ---------- Histórico recente de partidas ----------
  minhasPartidas: autenticado.query(async ({ ctx }) => {
    const c = ctx as unknown as CtxAutenticado;
    const lista = await getDb().query.partidas.findMany({
      where: and(eq(partidas.usuarioId, c.usuario.id), eq(partidas.estado, "encerrada")),
      orderBy: [desc(partidas.encerradaEm)],
      limit: 20,
    });
    return lista.map((p) => ({
      id: p.id,
      modo: p.modo,
      mapa: p.mapa,
      ranqueada: p.ranqueada, // v82
      online: p.online,
      tamanho: p.tamanho,
      rqDelta: p.rqDelta,
      placarNosso: p.placarNosso,
      placarDeles: p.placarDeles,
      resultado: p.resultado,
      gols: p.gols,
      assistencias: p.assistencias,
      golsGinga: p.golsGinga,
      duracaoSeg: p.duracaoSeg,
      xpConcedido: p.xpConcedido,
      encerradaEm: p.encerradaEm,
    }));
  }),
});
