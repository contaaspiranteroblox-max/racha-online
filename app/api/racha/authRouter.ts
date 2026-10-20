// ============================================================================
// RACHA 2.0 — Router de contas: registro, login, sessões, recuperação
// ============================================================================
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, isNull, gt, desc } from "drizzle-orm";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { usuarios, sessoes, estatisticas, itensUsuario, cargos, selos, recuperacaoTokens } from "@db/schema";
import { enviarEmail } from "../lib/email";
import {
  hashSenha,
  verificarSenha,
  novoToken,
  sha256,
  novoUuid,
  novoCodigoRecuperacao,
} from "./security";
import {
  autenticado,
  sessaoDaRequisicao,
  ipDaRequisicao,
  exigeLimite,
  SESSAO_DIAS,
  type CtxAutenticado,
} from "./guard";
import { formatarIdPublico, tituloPorNivel } from "@contracts/racha";
import { estadoRanqueada } from "./ranqueada"; // v82: a patente da conta
import {
  cadastroAberto, MSG_CADASTRO_FECHADO, proximoIdPublico, contasZeradasEm, ehSenhaDoManual, ehContaDoDono, AVISO_SENHA_DO_MANUAL,
  senhaDoDonoNoAmbiente, AVISO_SENHA_DO_AMBIENTE, nasceuDepoisDoZerar,
} from "./contas";
// v88.1: quando as contas foram zeradas e se esta conta nasceu depois disso (o jogo confere o que o aparelho guardava)
async function marcaZerar(u: { idPublico: number | string }) {
  const zeradoEm = await contasZeradasEm();
  return { zeradoEm, depoisDoZerar: nasceuDepoisDoZerar(u, zeradoEm) };
} // v88.1: o cadastro fechado (só o Dono cria contas), o número das contas e a senha do Dono

const usernameSchema = z
  .string()
  .min(3, "Usuário precisa de 3+ caracteres")
  .max(24)
  .regex(/^[a-z0-9_.]+$/, "Use letras minúsculas, números, _ ou .")
  .transform((s) => s.toLowerCase());

const senhaSchema = z.string().min(8, "Senha precisa de 8+ caracteres").max(100);

async function criarSessao(usuarioId: number, req: Request, painelAdmin = false) {
  const db = getDb();
  const token = novoToken();
  const duracao = painelAdmin ? 8 * 60 * 60 * 1000 : SESSAO_DIAS * 24 * 60 * 60 * 1000;
  await db.insert(sessoes).values({
    usuarioId,
    tokenHash: sha256(token),
    painelAdmin,
    ip: ipDaRequisicao(req),
    agente: (req.headers.get("user-agent") || "").slice(0, 200),
    expiraEm: new Date(Date.now() + duracao),
  });
  return token;
}

function cookieSessao(token: string, maxAgeSeg: number): string {
  return `racha_sessao=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeg}`;
}

// Perfil público de um usuário (nunca expõe dados privados)
export function paraPublico(u: typeof usuarios.$inferSelect, selosLista: string[] = []) {
  return {
    idPublico: formatarIdPublico(Number(u.idPublico)),
    nomeExibicao: u.nomeExibicao,
    username: u.username,
    nivel: u.nivel,
    tituloCarreira: tituloPorNivel(u.nivel),
    tituloEquipado: u.tituloEquipado,
    avatarEmoji: u.avatarEmoji,
    corDestaque: u.corDestaque,
    skinEquipada: u.skinEquipada,
    tampa: u.tampa ?? null, // v69: a tampinha personalizada do jogo (código T.…)
    bannerEquipado: u.bannerEquipado,
    molduraEquipada: u.molduraEquipada,
    selos: selosLista,
    criadoEm: u.criadoEm,
  };
}

export const authRouter = createRouter({
  // ---------- Registro ----------
  registrar: publicQuery
    .input(
      z
        .object({
          username: usernameSchema,
          nomeExibicao: z.string().trim().min(2).max(32),
          senha: senhaSchema,
          confirmacaoSenha: z.string().min(1).max(100), // v84
          // v90.1: o e-mail é opcional (o login de teste: só o usuário e a senha). Com e-mail, a recuperação por e-mail funciona;
          // sem ele, a conta se recupera pelo código de recuperação mostrado no cadastro.
          email: z.union([z.literal(""), z.string().trim().email("E-mail inválido.").max(120)]).optional(),
          aceiteTermos: z.literal(true, { error: "É preciso aceitar os termos e a política de privacidade." }), // v84
        })
        .refine((d) => d.senha === d.confirmacaoSenha, { message: "As senhas não são iguais.", path: ["confirmacaoSenha"] }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const ip = ipDaRequisicao(ctx.req);
      // v88.1: com o cadastro fechado (o padrão), as contas novas só saem do RACHA CONTROL › Contas (o Dono)
      if (!(await cadastroAberto()).aberto) throw new TRPCError({ code: "FORBIDDEN", message: MSG_CADASTRO_FECHADO });
      await exigeLimite(`registro:${ip}`, 5, 60 * 60 * 1000, "Muitos registros. Tente mais tarde.");

      const existe = await db.query.usuarios.findFirst({ where: eq(usuarios.username, input.username) });
      if (existe) throw new TRPCError({ code: "CONFLICT", message: "Esse usuário já está em uso." });
      const email = input.email ? input.email.trim().toLowerCase() : null;
      const em = email ? await db.query.usuarios.findFirst({ where: eq(usuarios.email, email) }) : null;
      if (em) throw new TRPCError({ code: "CONFLICT", message: "Esse email já está em uso." });

      // ID público: gerado SÓ pelo servidor, atômico (LAST_INSERT_ID numa transação: a mesma conexão do pool). v88.1: os
      // números só voltam a ser usados depois do ZERAR CONTAS do Dono (RACHA CONTROL › Contas)
      const idPublico = await proximoIdPublico();

      const codigoRecuperacao = novoCodigoRecuperacao();
      let novoId = 0;
      try {
        const [res] = await db.insert(usuarios).values({
          uuid: novoUuid(),
          idPublico,
          username: input.username,
          nomeExibicao: input.nomeExibicao,
          senhaHash: hashSenha(input.senha),
          email,
          aceiteTermosEm: new Date(), // v84
          codigoRecuperacaoHash: hashSenha(codigoRecuperacao),
          tituloEquipado: "Novato da Rua",
        });
        novoId = Number(res.insertId);
      } catch (e: unknown) {
        if (String(e).includes("username")) throw new TRPCError({ code: "CONFLICT", message: "Esse usuário já está em uso." });
        throw e;
      }

      await db.insert(estatisticas).values({ usuarioId: novoId, modos: {} });
      await db.insert(itensUsuario).values([
        { usuarioId: novoId, codigoItem: "skin_padrao", origem: "inicial" },
        { usuarioId: novoId, codigoItem: "banner_laje_noturna", origem: "inicial" },
      ]);

      const token = await criarSessao(novoId, ctx.req);
      await db.update(usuarios).set({ ultimoLoginEm: new Date() }).where(eq(usuarios.id, novoId));
      ctx.resHeaders.append("set-cookie", cookieSessao(token, SESSAO_DIAS * 24 * 3600));

      const u = await db.query.usuarios.findFirst({ where: eq(usuarios.id, novoId) });
      return {
        token,
        conta: { ...paraPublico(u!), ...(await marcaZerar(u!)) },
        // Código de recuperação: mostrado UMA vez, guardado só como hash
        codigoRecuperacao,
      };
    }),

  // ---------- Login (v84: e-mail OU usuário + senha) ----------
  entrar: publicQuery
    .input(
      z.object({
        identificador: z.string().trim().min(1).max(120), // usuário ou e-mail
        senha: z.string().min(1).max(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const ip = ipDaRequisicao(ctx.req);
      const ident = input.identificador.toLowerCase();
      await exigeLimite(`login:${ip}`, 15, 15 * 60 * 1000, "Muitas tentativas. Aguarde 15 minutos.");
      await exigeLimite(`login:${ip}:${ident}`, 5, 15 * 60 * 1000, "Muitas tentativas nessa conta. Aguarde.");

      const ehEmail = ident.includes("@");
      const u = ehEmail
        ? await db.query.usuarios.findFirst({ where: eq(usuarios.email, ident) })
        : await db.query.usuarios.findFirst({ where: eq(usuarios.username, ident) });
      // Mesma mensagem para conta inexistente e senha errada: não revela se o e-mail/usuário existe
      if (!u || !verificarSenha(input.senha, u.senhaHash)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "E-mail/usuário ou senha incorretos." });
      }
      // v88.1: a senha do manual (pública no repositório) não abre a conta do Dono — nem no jogo, nem no RACHA CONTROL
      if (ehSenhaDoManual(input.senha) && (ehContaDoDono(u) || (await db.query.cargos.findFirst({ where: eq(cargos.usuarioId, u.id) }))?.cargo === "dono")) {
        throw new TRPCError({ code: "FORBIDDEN", message: AVISO_SENHA_DO_MANUAL });
      }
      if (u.estado === "banido") throw new TRPCError({ code: "FORBIDDEN", message: "Conta banida do RACHA." });
      if (u.estado === "suspenso" && u.suspensoAte && u.suspensoAte.getTime() > Date.now()) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Conta suspensa até ${u.suspensoAte.toLocaleString("pt-BR")}.`,
        });
      }

      const token = await criarSessao(u.id, ctx.req);
      await db.update(usuarios).set({ ultimoLoginEm: new Date() }).where(eq(usuarios.id, u.id));
      ctx.resHeaders.append("set-cookie", cookieSessao(token, SESSAO_DIAS * 24 * 3600));
      // v88.1: + quando as contas foram zeradas (o jogo confere o que o aparelho guardava para este número)
      return { token, conta: { ...paraPublico(u), ...(await marcaZerar(u)) } };
    }),

  // ---------- v88.1: o cadastro está aberto? (o jogo e o site escondem o CRIAR CONTA quando está fechado) ----------
  cadastro: publicQuery.query(async () => ({ aberto: (await cadastroAberto()).aberto })),

  // ---------- Sessão atual ----------
  eu: publicQuery.query(async ({ ctx }) => {
    const s = await sessaoDaRequisicao(ctx.req);
    if (!s) return { logado: false as const };
    const db = getDb();
    const papel = await db.query.cargos.findFirst({ where: eq(cargos.usuarioId, s.usuario.id) });
    const meusSelos = await db.query.selos.findMany({ where: eq(selos.usuarioId, s.usuario.id) });
    const rq = await estadoRanqueada(s.usuario.id); // v82: a patente vai junto (o jogo mostra a da conta)
    return {
      logado: true as const,
      conta: {
        ...paraPublico(s.usuario, meusSelos.map((x) => x.selo)),
        xp: s.usuario.xp,
        rq,
        email: s.usuario.email,
        perfilPublico: s.usuario.perfilPublico,
        aceitaPedidos: s.usuario.aceitaPedidos,
        cargo: papel?.cargo ?? null,
        ...(await marcaZerar(s.usuario)), // v88.1: quando as contas foram zeradas (null = nunca) e se esta conta nasceu depois
      },
    };
  }),

  // ---------- Sair (revoga a sessão) ----------
  sair: autenticado.mutation(async ({ ctx }) => {
    const c = ctx as unknown as CtxAutenticado;
    await getDb().update(sessoes).set({ revogadaEm: new Date() }).where(eq(sessoes.id, c.sessao.id));
    ctx.resHeaders.append("set-cookie", cookieSessao("", 0));
    return { ok: true };
  }),

  // ---------- Minhas sessões + revogação ----------
  minhasSessoes: autenticado.query(async ({ ctx }) => {
    const c = ctx as unknown as CtxAutenticado;
    const lista = await getDb().query.sessoes.findMany({
      where: and(eq(sessoes.usuarioId, c.usuario.id), isNull(sessoes.revogadaEm), gt(sessoes.expiraEm, new Date())),
      orderBy: [desc(sessoes.criadaEm)],
    });
    return lista.map((s) => ({
      id: s.id,
      atual: s.id === c.sessao.id,
      painelAdmin: s.painelAdmin,
      ip: s.ip,
      agente: s.agente,
      criadaEm: s.criadaEm,
    }));
  }),

  revogarSessao: autenticado
    .input(z.object({ sessaoId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const c = ctx as unknown as CtxAutenticado;
      const db = getDb();
      const s = await db.query.sessoes.findFirst({ where: and(eq(sessoes.id, input.sessaoId), eq(sessoes.usuarioId, c.usuario.id)) });
      if (!s) throw new TRPCError({ code: "NOT_FOUND", message: "Sessão não encontrada." });
      await db.update(sessoes).set({ revogadaEm: new Date() }).where(eq(sessoes.id, s.id));
      return { ok: true };
    }),

  // ---------- Trocar senha (revoga as outras sessões) ----------
  trocarSenha: autenticado
    .input(z.object({ senhaAtual: z.string().min(1), novaSenha: senhaSchema }))
    .mutation(async ({ ctx, input }) => {
      const c = ctx as unknown as CtxAutenticado;
      const db = getDb();
      if (ehContaDoDono(c.usuario) && senhaDoDonoNoAmbiente()) throw new TRPCError({ code: "FORBIDDEN", message: AVISO_SENHA_DO_AMBIENTE }); // v88.1
      if (!verificarSenha(input.senhaAtual, c.usuario.senhaHash)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Senha atual incorreta." });
      }
      await db.update(usuarios).set({ senhaHash: hashSenha(input.novaSenha) }).where(eq(usuarios.id, c.usuario.id));
      await db
        .update(sessoes)
        .set({ revogadaEm: new Date() })
        .where(and(eq(sessoes.usuarioId, c.usuario.id), isNull(sessoes.revogadaEm)));
      return { ok: true, aviso: "Senha trocada. Entre de novo na sua conta." };
    }),

  // ---------- Recuperação de conta (código mostrado no registro) ----------
  recuperar: publicQuery
    .input(
      z.object({
        username: z.string().trim().min(1).max(24),
        codigo: z.string().trim().min(8).max(30),
        novaSenha: senhaSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const ip = ipDaRequisicao(ctx.req);
      await exigeLimite(`recuperar:${ip}`, 5, 60 * 60 * 1000, "Muitas tentativas de recuperação.");

      const u = await db.query.usuarios.findFirst({ where: eq(usuarios.username, input.username.toLowerCase()) });
      if (!u || !u.codigoRecuperacaoHash || !verificarSenha(input.codigo.toUpperCase(), u.codigoRecuperacaoHash)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuário ou código de recuperação inválidos." });
      }
      if (ehContaDoDono(u) && senhaDoDonoNoAmbiente()) throw new TRPCError({ code: "FORBIDDEN", message: AVISO_SENHA_DO_AMBIENTE }); // v88.1
      const novoCodigo = novoCodigoRecuperacao();
      await db
        .update(usuarios)
        .set({ senhaHash: hashSenha(input.novaSenha), codigoRecuperacaoHash: hashSenha(novoCodigo) })
        .where(eq(usuarios.id, u.id));
      await db.update(sessoes).set({ revogadaEm: new Date() }).where(eq(sessoes.usuarioId, u.id));
      return { ok: true, novoCodigoRecuperacao: novoCodigo };
    }),

  // ---------- v84: recuperação por e-mail ----------
  // NUNCA revela se o e-mail está cadastrado: a resposta é sempre a mesma.
  pedirRecuperacaoEmail: publicQuery
    .input(z.object({ email: z.string().email("E-mail inválido.").max(120) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const ip = ipDaRequisicao(ctx.req);
      await exigeLimite(`recup-email:${ip}`, 5, 60 * 60 * 1000, "Muitas tentativas. Tente mais tarde.");
      const email = input.email.toLowerCase();

      const u = await db.query.usuarios.findFirst({ where: eq(usuarios.email, email) });
      if (u && u.estado !== "banido") {
        // Invalida links anteriores do mesmo usuário antes de emitir um novo
        await db
          .update(recuperacaoTokens)
          .set({ usadoEm: new Date() })
          .where(and(eq(recuperacaoTokens.usuarioId, u.id), isNull(recuperacaoTokens.usadoEm)));
        const token = novoToken();
        await db.insert(recuperacaoTokens).values({
          usuarioId: u.id,
          tokenHash: sha256(token),
          expiraEm: new Date(Date.now() + 60 * 60 * 1000), // 1 hora
        });
        const base = process.env.RACHA_BASE_URL || "https://racha.seudominio.com";
        await enviarEmail(
          email,
          "RACHA — redefinir sua senha",
          [
            `Olá, ${u.nomeExibicao}!`,
            "",
            "Recebemos um pedido para redefinir a senha da sua conta do RACHA.",
            `Link (vale por 1 hora): ${base}/redefinir?token=${encodeURIComponent(token)}`,
            "",
            "Se não foi você, ignore este e-mail: sua senha continua a mesma.",
          ].join("\n"),
        );
      }
      // Resposta idêntica com ou sem conta (não revela cadastro)
      return { ok: true, mensagem: "Se esse e-mail estiver cadastrado, enviamos um link para redefinir a senha." };
    }),

  redefinirSenha: publicQuery
    .input(z.object({ token: z.string().trim().min(20).max(200), novaSenha: senhaSchema }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const ip = ipDaRequisicao(ctx.req);
      await exigeLimite(`redefinir:${ip}`, 10, 60 * 60 * 1000, "Muitas tentativas. Tente mais tarde.");

      const t = await db.query.recuperacaoTokens.findFirst({
        where: and(
          eq(recuperacaoTokens.tokenHash, sha256(input.token)),
          isNull(recuperacaoTokens.usadoEm),
          gt(recuperacaoTokens.expiraEm, new Date()),
        ),
      });
      if (!t) throw new TRPCError({ code: "UNAUTHORIZED", message: "Link inválido ou vencido. Peça outro." });
      const dono = await db.query.usuarios.findFirst({ where: eq(usuarios.id, t.usuarioId), columns: { idPublico: true } });
      if (dono && ehContaDoDono(dono) && senhaDoDonoNoAmbiente()) throw new TRPCError({ code: "FORBIDDEN", message: AVISO_SENHA_DO_AMBIENTE }); // v88.1

      // Marca como usado ANTES de trocar a senha (o link serve uma vez só)
      await db.update(recuperacaoTokens).set({ usadoEm: new Date() }).where(eq(recuperacaoTokens.id, t.id));
      const novoCodigo = novoCodigoRecuperacao();
      await db
        .update(usuarios)
        .set({ senhaHash: hashSenha(input.novaSenha), codigoRecuperacaoHash: hashSenha(novoCodigo) })
        .where(eq(usuarios.id, t.usuarioId));
      // Derruba todas as sessões (quem tinha a senha antiga sai)
      await db.update(sessoes).set({ revogadaEm: new Date() }).where(eq(sessoes.usuarioId, t.usuarioId));
      return { ok: true, novoCodigoRecuperacao: novoCodigo };
    }),
});
