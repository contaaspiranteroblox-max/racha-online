// ============================================================================
// RACHA v88.1 — RACHA CONTROL › CONTAS (só o Dono). O cadastro do jogo fica FECHADO e as contas novas saem daqui:
//  · CRIAR CONTA: usuário, nome, e-mail (opcional) e a senha (em branco = o servidor gera uma). O usuário, a senha e o código
//    de recuperação aparecem UMA vez, para o Dono mandar para o jogador (o banco guarda só os hashes);
//  · SENHA NOVA para uma conta (as sessões dela caem);
//  · o CADASTRO PÚBLICO (abrir/fechar: aberto, qualquer um cria a conta pelo jogo, como antes da v88.1);
//  · ZERAR CONTAS (só a conta 000001): apaga todas as outras contas, os números voltam a contar do 000002 e o servidor das
//    salas esquece as contas apagadas. Pede a senha do Dono e a palavra ZERAR.
// A mesma sessão do painel (com o 2FA) e só o cargo Dono; cada ação vai para a auditoria.
// ============================================================================
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, or, like, isNull, asc } from "drizzle-orm";
import { createRouter } from "../../middleware";
import { getDb } from "../../queries/connection";
import { usuarios, sessoes, estatisticas, itensUsuario } from "@db/schema";
import { adminAutenticado, auditar, ipDaRequisicao, exigeLimite, type CtxAdmin } from "../guard";
import { hashSenha, verificarSenha, novoUuid, novoCodigoRecuperacao } from "../security";
import { formatarIdPublico } from "@contracts/racha";
import {
  cadastroAberto, definirCadastro, proximoIdPublico, idDaProximaConta, senhaGerada, zerarContas, contasZeradasEm, ehContaDoDono,
  ehSenhaDoManual, AVISO_SENHA_DO_AMBIENTE, ID_DONO,
} from "../contas";
import { contasZeradas } from "../../lib/salas";

// (as regras do cadastro do jogo; conferidas à mão para a mensagem chegar limpa no painel)
const ruim = (message: string): never => { throw new TRPCError({ code: "BAD_REQUEST", message }); };
function confereUsuario(u: string): string {
  const s = u.trim().toLowerCase();
  if (s.length < 3 || s.length > 24) ruim("O usuário precisa de 3 a 24 caracteres.");
  if (!/^[a-z0-9_.]+$/.test(s)) ruim("Usuário: só letras minúsculas, números, _ ou . (sem espaço nem acento).");
  return s;
}
function confereSenha(s: string): string {
  if (!s) return "";
  if (s.length < 8) ruim("A senha precisa de 8 caracteres ou mais (ou deixe em branco: o servidor gera uma).");
  if (ehSenhaDoManual(s)) ruim("Essa senha é pública (está no manual). Escolha outra ou deixe em branco.");
  return s;
}

// só a conta do Dono: o cargo Dono E a conta 000001 ("só eu"). Um segundo Dono (o cargo dado pelo RACHA CONTROL) não cria
// contas, não vê a lista (os e-mails), não troca senha de ninguém e não zera.
async function exigeDono(ctx: unknown, acao: string): Promise<CtxAdmin> {
  const c = ctx as CtxAdmin;
  if (!(c.papel.cargo === "dono" && ehContaDoDono(c.usuario))) {
    await auditar({ operadorId: c.usuario.id, cargo: c.papel.cargo, acao, resultado: "negado", detalhes: { motivo: "só a conta do Dono (000001)" }, ip: ipDaRequisicao(c.req) });
    throw new TRPCError({ code: "FORBIDDEN", message: "Só a conta do Dono do RACHA (000001) mexe nas contas." });
  }
  return c;
}
const pubDe = (termo: string | number) => {
  const t = String(termo).trim();
  return /^0*\d{1,9}$/.test(t) ? Number(t) : null;
};

export const donoContasRouter = createRouter({
  // o resumo da aba: o cadastro (e de onde veio), quantas contas, o número da próxima e quando foram zeradas
  estado: adminAutenticado.query(async ({ ctx }) => {
    const c = await exigeDono(ctx, "contas_estado");
    const db = getDb();
    const todas = await db.query.usuarios.findMany({ where: isNull(usuarios.excluidoEm), columns: { id: true } });
    return {
      cadastro: await cadastroAberto(),
      total: todas.length,
      proximo: formatarIdPublico(await idDaProximaConta()),
      zeradoEm: await contasZeradasEm(),
      eu: formatarIdPublico(Number(c.usuario.idPublico)),
      podeZerar: true, // (só a 000001 chega aqui)
    };
  }),

  listar: adminAutenticado
    .input(z.object({ busca: z.string().trim().max(40).default(""), limite: z.number().int().min(1).max(500).default(200) }).default({ busca: "", limite: 200 }))
    .query(async ({ ctx, input }) => {
      await exigeDono(ctx, "contas_listar");
      const db = getDb();
      const b = input.busca.toLowerCase().replace(/[%_\\]/g, "");
      const num = pubDe(input.busca);
      const onde = !b ? isNull(usuarios.excluidoEm)
        : and(isNull(usuarios.excluidoEm), or(like(usuarios.username, `%${b}%`), like(usuarios.nomeExibicao, `%${input.busca.replace(/[%_\\]/g, "")}%`), ...(num ? [eq(usuarios.idPublico, num)] : [])));
      const lista = await db.query.usuarios.findMany({ where: onde, orderBy: [asc(usuarios.idPublico)], limit: input.limite });
      const papeis = await db.query.cargos.findMany();
      return lista.map((u) => ({
        idPublico: formatarIdPublico(Number(u.idPublico)), username: u.username, nomeExibicao: u.nomeExibicao, email: u.email ?? null,
        estado: u.estado, criadoEm: u.criadoEm, ultimoLoginEm: u.ultimoLoginEm ?? null, cargo: papeis.find((p) => p.usuarioId === u.id)?.cargo ?? null,
        dono: ehContaDoDono(u),
      }));
    }),

  // CRIAR CONTA: devolve o usuário e a senha UMA vez (o banco guarda só o hash)
  criar: adminAutenticado
    .input(z.object({
      username: z.string().max(60), nomeExibicao: z.string().max(80), email: z.string().max(160).default(""), senha: z.string().max(100).default(""),
      aceiteTermos: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const c = await exigeDono(ctx, "conta_criar");
      const db = getDb();
      const username = confereUsuario(input.username);
      const nomeExibicao = input.nomeExibicao.trim();
      if (nomeExibicao.length < 2 || nomeExibicao.length > 32) ruim("O nome no jogo precisa de 2 a 32 caracteres.");
      const email = input.email.trim() ? input.email.trim().toLowerCase() : null;
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ruim("E-mail inválido (ou deixe em branco).");
      const senhaPedida = confereSenha(input.senha);
      if (!input.aceiteTermos) ruim("Confirme que o jogador aceitou os termos de uso e a política de privacidade.");
      await exigeLimite(`conta_criar:${c.usuario.id}`, 60, 60 * 60 * 1000, "Muitas contas seguidas. Espere um pouco.");
      if (await db.query.usuarios.findFirst({ where: eq(usuarios.username, username), columns: { id: true } })) {
        throw new TRPCError({ code: "CONFLICT", message: "Esse usuário já está em uso." });
      }
      if (email && (await db.query.usuarios.findFirst({ where: eq(usuarios.email, email), columns: { id: true } }))) {
        throw new TRPCError({ code: "CONFLICT", message: "Esse e-mail já está em uso." });
      }
      const senha = senhaPedida || senhaGerada();
      const codigoRecuperacao = novoCodigoRecuperacao();
      const idPublico = await proximoIdPublico();
      let novoId = 0;
      try {
        const [res] = await db.insert(usuarios).values({
          uuid: novoUuid(), idPublico, username, nomeExibicao, senhaHash: hashSenha(senha), email,
          aceiteTermosEm: new Date(), codigoRecuperacaoHash: hashSenha(codigoRecuperacao), tituloEquipado: "Novato da Rua",
        });
        novoId = Number(res.insertId);
      } catch (e: unknown) {
        if (String(e).includes("username")) throw new TRPCError({ code: "CONFLICT", message: "Esse usuário já está em uso." });
        if (String(e).includes("email")) throw new TRPCError({ code: "CONFLICT", message: "Esse e-mail já está em uso." });
        throw e;
      }
      await db.insert(estatisticas).values({ usuarioId: novoId, modos: {} });
      await db.insert(itensUsuario).values([
        { usuarioId: novoId, codigoItem: "skin_padrao", origem: "inicial" },
        { usuarioId: novoId, codigoItem: "banner_laje_noturna", origem: "inicial" },
      ]);
      await auditar({ operadorId: c.usuario.id, cargo: c.papel.cargo, acao: "conta_criar", alvoId: novoId, detalhes: { idPublico: formatarIdPublico(idPublico), username, senhaGerada: !senhaPedida }, resultado: "ok", ip: ipDaRequisicao(c.req) });
      return {
        idPublico: formatarIdPublico(idPublico), username, nomeExibicao, email,
        senha, senhaGerada: !senhaPedida, codigoRecuperacao,
      };
    }),

  // SENHA NOVA: gera (ou usa a que o Dono escreveu), derruba as sessões da conta e devolve a senha UMA vez
  novaSenha: adminAutenticado
    .input(z.object({ conta: z.union([z.string().max(40), z.number().int()]), senha: z.string().max(100).default("") }))
    .mutation(async ({ ctx, input }) => {
      const c = await exigeDono(ctx, "conta_nova_senha");
      const db = getDb();
      await exigeLimite(`conta_senha:${c.usuario.id}`, 30, 60 * 60 * 1000, "Muitas trocas seguidas. Espere um pouco.");
      const num = pubDe(input.conta);
      const u = num
        ? await db.query.usuarios.findFirst({ where: eq(usuarios.idPublico, num) })
        : await db.query.usuarios.findFirst({ where: eq(usuarios.username, String(input.conta).trim().toLowerCase()) });
      if (!u || u.excluidoEm) throw new TRPCError({ code: "NOT_FOUND", message: "Conta não encontrada." });
      if (ehContaDoDono(u)) throw new TRPCError({ code: "FORBIDDEN", message: "A senha da conta do Dono não muda por aqui. " + AVISO_SENHA_DO_AMBIENTE });
      const senha = confereSenha(input.senha) || senhaGerada();
      const codigoRecuperacao = novoCodigoRecuperacao(); // (o código antigo para de valer: quem mais o tivesse não troca a senha de novo)
      await db.update(usuarios).set({ senhaHash: hashSenha(senha), codigoRecuperacaoHash: hashSenha(codigoRecuperacao) }).where(eq(usuarios.id, u.id));
      await db.update(sessoes).set({ revogadaEm: new Date() }).where(and(eq(sessoes.usuarioId, u.id), isNull(sessoes.revogadaEm)));
      await auditar({ operadorId: c.usuario.id, cargo: c.papel.cargo, acao: "conta_nova_senha", alvoId: u.id, detalhes: { idPublico: formatarIdPublico(Number(u.idPublico)) }, resultado: "ok", ip: ipDaRequisicao(c.req) });
      return { idPublico: formatarIdPublico(Number(u.idPublico)), username: u.username, senha, codigoRecuperacao };
    }),

  // o CADASTRO PÚBLICO: aberto (qualquer um cria a conta pelo jogo) ou fechado (só o Dono, por aqui)
  cadastro: adminAutenticado.input(z.object({ aberto: z.boolean() })).mutation(async ({ ctx, input }) => {
    const c = await exigeDono(ctx, "cadastro_" + (input.aberto ? "abrir" : "fechar"));
    await definirCadastro(input.aberto);
    await auditar({ operadorId: c.usuario.id, cargo: c.papel.cargo, acao: "cadastro_" + (input.aberto ? "abrir" : "fechar"), resultado: "ok", ip: ipDaRequisicao(c.req) });
    return { ok: true, cadastro: await cadastroAberto() };
  }),

  // ZERAR CONTAS: só a conta 000001, com a senha dela e a palavra ZERAR
  zerar: adminAutenticado
    .input(z.object({ senha: z.string().max(100), confirmacao: z.string().max(20) }))
    .mutation(async ({ ctx, input }) => {
      const c = await exigeDono(ctx, "contas_zerar");
      const ip = ipDaRequisicao(c.req);
      if (input.confirmacao.trim() !== "ZERAR") ruim("Escreva ZERAR (em maiúsculas) para confirmar.");
      if (!input.senha) ruim("Digite a senha do Dono.");
      await exigeLimite(`contas_zerar:${c.usuario.id}`, 5, 60 * 60 * 1000, "Muitas tentativas. Espere um pouco.");
      if (!verificarSenha(input.senha, c.usuario.senhaHash)) {
        await auditar({ operadorId: c.usuario.id, cargo: c.papel.cargo, acao: "contas_zerar", resultado: "negado", detalhes: { motivo: "senha errada" }, ip });
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Senha do Dono errada." });
      }
      const r = await zerarContas(c.usuario.id);
      contasZeradas([formatarIdPublico(ID_DONO)], r.em); // o servidor das salas (montado aqui) esquece as contas apagadas
      await auditar({ operadorId: c.usuario.id, cargo: c.papel.cargo, acao: "contas_zerar", detalhes: { apagadas: r.apagadas, ids: r.pubs.slice(0, 500) }, resultado: "ok", ip });
      return { ok: true, apagadas: r.apagadas, proximo: formatarIdPublico(r.proximo), eu: formatarIdPublico(ID_DONO) };
    }),
});
