// ============================================================================
// RACHA v109 — RACHA CONTROL › O PAINEL DA STAFF (moderação). A staff (Administrador, Moderador e Ajudante) cuida do jogo:
//   · a FICHA do jogador para moderar (as punições, o silêncio, as denúncias contra ele e as notas da equipe);
//   · SILENCIAR o chat (5 min, 10 min, 1 hora, 1 dia, 5, 10 ou 30 dias — com o teto do cargo): o jogador não manda nada em
//     nenhum chat das salas até lá (server/silencio109.js) e recebe o aviso;
//   · BANIR por um tempo (1, 3, 7, 30 ou 90 dias, com o teto do cargo) ou PARA SEMPRE (só Administrador e o Dono);
//   · ADVERTIR (o jogador recebe a advertência na central de mensagens), TIRAR DA SALA (sai da partida em que está agora),
//     TROCAR O NOME (e a frase do perfil) impróprios, as NOTAS da equipe, TIRAR uma punição;
//   · a lista dos PUNIDOS (quem está silenciado, banido por um tempo e para sempre), as DENÚNCIAS com o que foi dito e as
//     ações direto da denúncia (que já fica resolvida), e MEUS REGISTROS (só o que a própria pessoa fez).
// Nada daqui dá selo, presente, item, moeda, gema ou XP: isso é só do painel do Dono (dono.ts). Cada ação — e cada tentativa
// negada — vai para a auditoria, que o Dono vê inteira.
// ============================================================================
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, gt, gte, inArray, or } from "drizzle-orm";
import { createRouter } from "../../middleware";
import { getDb } from "../../queries/connection";
import { usuarios, punicoes, sessoes, notasStaff, denuncias, auditoria, selos, estatisticas, cargos } from "@db/schema";
import { adminAutenticado, exigePermissao, exigeAlvoPermitido, cargoDo, type CtxAdmin } from "../guard";
import {
  SILENCIO_OPCOES, SILENCIO_MAX_MIN, BANIMENTO_OPCOES, SUSPENSAO_MAX_HORAS, CARGO_PESO, formatarIdPublico, tituloPorNivel,
  type Cargo,
} from "@contracts/racha";
import { contaPunida, contaSilenciada, expulsaConta } from "../../lib/salas";
import { notifica } from "../v88/comum";
import { estadoRanqueada, infoPatente } from "../ranqueada";
import { jogadorOuErro, silencioAtivo, duracaoTexto, dataHora, registra, nega, nomeCargo, type Usuario } from "./comum109";

const termoZ = z.string().trim().min(1).max(40);
const motivoZ = z.string().trim().min(3, "Escreva o motivo (3 letras ou mais).").max(300);
const ctxDe = (ctx: unknown) => ctx as CtxAdmin;
const tem = (c: CtxAdmin, p: string) => (c.papel.permissoes as string[]).includes(p);
const rotuloMin = (min: number) => SILENCIO_OPCOES.find((o) => o.min === min)?.rotulo ?? duracaoTexto(min * 60000);
const rotuloHoras = (h: number) => BANIMENTO_OPCOES.find((o) => o.horas === h)?.rotulo ?? (h % 24 === 0 ? `${h / 24} dias` : `${h} horas`);
const pubDe = (u: Usuario) => formatarIdPublico(Number(u.idPublico));

// o que este cargo pode escolher no painel (os tempos do silêncio e do banimento dentro do teto)
function opcoesDo(c: CtxAdmin) {
  const cargo = c.papel.cargo as Cargo;
  const silencio = tem(c, "silenciar") ? SILENCIO_OPCOES.filter((o) => o.min <= SILENCIO_MAX_MIN[cargo]) : [];
  const banir = BANIMENTO_OPCOES.filter((o) =>
    o.horas === 0 ? tem(c, "aplicar_punicoes") && (cargo === "administrador" || cargo === "dono") : tem(c, "suspender") && o.horas <= SUSPENSAO_MAX_HORAS[cargo],
  );
  return { silencio, banir };
}

// a punição está valendo agora? (a advertência é só um registro; a suspensão e o silêncio vencem; o banimento não)
const valendo = (p: typeof punicoes.$inferSelect, agora = Date.now()) =>
  p.ativa && p.tipo !== "advertencia" && (p.tipo === "banimento" || (!!p.expiraEm && p.expiraEm.getTime() > agora));

// a denúncia de onde a ação saiu fica resolvida (por quem agiu)
async function resolveDenuncia(c: CtxAdmin, id: number | undefined, alvoId: number, acao: string) {
  if (!id) return;
  const db = getDb();
  const d = await db.query.denuncias.findFirst({ where: eq(denuncias.id, id) });
  if (!d || d.alvoId !== alvoId) return;
  await db.update(denuncias).set({ estado: "resolvida", resolvidaEm: new Date(), atribuidaA: c.usuario.id }).where(eq(denuncias.id, id));
  await registra(c, "resolver_denuncia", alvoId, { denuncia: id, acao });
}

// v109: quem pode TIRAR uma punição: o silêncio, quem silencia; o resto, Administrador ou o Dono — e nunca a de quem tem um
// cargo ACIMA do seu (o Ajudante não desfaz o silêncio que o Moderador deu; a do Dono, só o Dono). Quem deu sempre pode tirar.
const PESO_SEM_CARGO = 0;
export function podeTirar(c: CtxAdmin, p: { tipo: string; aplicadaPor: number }, cargoDeQuemDeu: string | null | undefined): boolean {
  if (!tem(c, p.tipo === "silencio" ? "silenciar" : "aplicar_punicoes")) return false;
  if (c.papel.cargo === "dono" || p.aplicadaPor === c.usuario.id) return true;
  const peso = cargoDeQuemDeu ? CARGO_PESO[cargoDeQuemDeu as Cargo] ?? PESO_SEM_CARGO : PESO_SEM_CARGO;
  return peso <= CARGO_PESO[c.papel.cargo as Cargo];
}
async function cargosDe(ids: number[]): Promise<Map<number, string>> {
  const l = ids.length ? await getDb().query.cargos.findMany({ where: inArray(cargos.usuarioId, ids) }) : [];
  return new Map(l.map((x) => [x.usuarioId, x.cargo]));
}

// o alvo é o próprio operador? (ninguém se pune)
function naoEmSi(c: CtxAdmin, u: Usuario) {
  if (u.id === c.usuario.id) throw new TRPCError({ code: "BAD_REQUEST", message: "Você não pode fazer isso na sua própria conta." });
}

export const staffRouter = createRouter({
  // quem sou eu no painel e os tempos que eu posso escolher
  opcoes: adminAutenticado.query(({ ctx }) => {
    const c = ctxDe(ctx);
    return { cargo: c.papel.cargo, nomeCargo: nomeCargo(c.papel.cargo), permissoes: c.papel.permissoes, ...opcoesDo(c) };
  }),

  // ==========================================================================
  // A FICHA DO JOGADOR (para moderar)
  // ==========================================================================
  ficha: adminAutenticado.input(z.object({ termo: termoZ })).query(async ({ ctx, input }) => {
    const c = ctxDe(ctx);
    exigePermissao(c, "consultar_jogadores");
    const u = await jogadorOuErro(input.termo);
    const db = getDb();
    const veNotas = tem(c, "anotar") || c.papel.cargo === "dono";
    const [papel, listaSelos, puns, notas, contra, rq, st, silencio] = await Promise.all([
      cargoDo(u.id),
      db.query.selos.findMany({ where: eq(selos.usuarioId, u.id) }),
      db.query.punicoes.findMany({ where: eq(punicoes.usuarioId, u.id), orderBy: [desc(punicoes.criadaEm)], limit: 30 }),
      veNotas ? db.query.notasStaff.findMany({ where: eq(notasStaff.usuarioId, u.id), orderBy: [desc(notasStaff.criadaEm)], limit: 30 }) : Promise.resolve([]),
      db.query.denuncias.findMany({ where: eq(denuncias.alvoId, u.id), orderBy: [desc(denuncias.criadaEm)], limit: 10 }),
      estadoRanqueada(u.id),
      db.query.estatisticas.findFirst({ where: eq(estatisticas.usuarioId, u.id) }),
      silencioAtivo(u.id),
    ]);
    const ids = [...new Set([...puns.map((p) => p.aplicadaPor), ...notas.map((n) => n.autorId)])];
    const quem = ids.length ? await db.query.usuarios.findMany({ where: inArray(usuarios.id, ids) }) : [];
    const nomeDe = (id: number) => quem.find((q) => q.id === id)?.nomeExibicao ?? `#${id}`;
    const cargoDeQuem = await cargosDe([...new Set(puns.map((p) => p.aplicadaPor))]);
    // (a staff olhando a ficha fica na auditoria — uma vez a cada 10 min por jogador, para o registro não encher)
    if (c.papel.cargo !== "dono") {
      const recente = await db.query.auditoria.findFirst({
        where: and(eq(auditoria.operadorId, c.usuario.id), eq(auditoria.alvoId, u.id), eq(auditoria.acao, "ver_ficha"), gte(auditoria.criadoEm, new Date(Date.now() - 10 * 60 * 1000))),
      });
      if (!recente) await registra(c, "ver_ficha", u.id);
    }
    // pode agir nele? (o Dono é protegido; a staff não mexe em cargo igual ou maior)
    const pesoAlvo = papel ? CARGO_PESO[papel.cargo] : 0;
    const podeAgir = u.id !== c.usuario.id && (c.papel.cargo === "dono" ? papel?.cargo !== "dono" : pesoAlvo < CARGO_PESO[c.papel.cargo]);
    const agora = Date.now();
    return {
      idPublico: pubDe(u),
      nome: u.nomeExibicao,
      username: u.username,
      avatarEmoji: u.avatarEmoji,
      bio: u.bio ?? null,
      nivel: u.nivel,
      titulo: tituloPorNivel(u.nivel),
      estado: u.estado,
      suspensoAte: u.suspensoAte,
      criadoEm: u.criadoEm,
      ultimoLoginEm: u.ultimoLoginEm,
      cargo: papel?.cargo ?? null,
      selos: listaSelos.map((s) => s.selo),
      patente: { pts: rq.pts, melhor: rq.melhor, jogos: rq.jogos, titulo: infoPatente(rq.pts).titulo },
      stats: st ? { partidas: st.partidas, vitorias: st.vitorias, gols: st.gols } : null,
      silencio,
      punicoes: puns.map((p) => ({
        id: p.id, tipo: p.tipo, motivo: p.motivo, expiraEm: p.expiraEm, criadaEm: p.criadaEm, valendo: valendo(p, agora), tirada: !p.ativa, por: nomeDe(p.aplicadaPor),
        podeTirar: valendo(p, agora) && podeAgir && podeTirar(c, p, cargoDeQuem.get(p.aplicadaPor)),
      })),
      notas: notas.map((n) => ({ id: n.id, texto: n.texto, criadaEm: n.criadaEm, por: nomeDe(n.autorId) })),
      denuncias: contra.map((d) => ({ id: d.id, motivo: d.motivo, estado: d.estado, criadaEm: d.criadaEm, detalhes: d.detalhes, canal: (d.contexto as { canal?: string } | null)?.canal ?? null })),
      podeAgir,
      veNotas,
    };
  }),

  // ==========================================================================
  // SILENCIAR O CHAT
  // ==========================================================================
  silenciar: adminAutenticado
    .input(z.object({ termo: termoZ, minutos: z.number().int().min(1), motivo: motivoZ, denunciaId: z.number().int().optional(), confirmacao: z.literal(true) }))
    .mutation(async ({ ctx, input }) => {
      const c = ctxDe(ctx);
      const db = getDb();
      const u = await jogadorOuErro(input.termo);
      naoEmSi(c, u);
      if (!tem(c, "silenciar")) await nega(c, "silenciar", u.id, "Seu cargo não silencia o chat.");
      if (!SILENCIO_OPCOES.some((o) => o.min === input.minutos)) throw new TRPCError({ code: "BAD_REQUEST", message: "Escolha um dos tempos do painel." });
      const teto = SILENCIO_MAX_MIN[c.papel.cargo as Cargo];
      if (input.minutos > teto) await nega(c, "silenciar", u.id, `O seu cargo silencia por no máximo ${rotuloMin(teto)}.`, { minutos: input.minutos });
      await exigeAlvoPermitido(c, u.id, "silenciar");
      const ate = new Date(Date.now() + input.minutos * 60000);
      // (o silêncio de antes, se tinha, dá lugar ao novo: o tempo novo conta de agora)
      await db.update(punicoes).set({ ativa: false }).where(and(eq(punicoes.usuarioId, u.id), eq(punicoes.tipo, "silencio"), eq(punicoes.ativa, true)));
      await db.insert(punicoes).values({ usuarioId: u.id, tipo: "silencio", motivo: input.motivo, aplicadaPor: c.usuario.id, expiraEm: ate });
      const conexoes = contaSilenciada(Number(u.idPublico), ate.getTime(), input.motivo);
      await notifica(u.id, {
        categoria: "sistema", titulo: "Você foi silenciado no chat",
        corpo: `A equipe do RACHA calou o seu chat por ${rotuloMin(input.minutos)} (até ${dataHora(ate)}, horário de Brasília). Até lá você não manda mensagens nos chats nem nas falas da partida. Motivo: ${input.motivo}`,
        refTipo: "silencio",
      });
      await resolveDenuncia(c, input.denunciaId, u.id, "silenciar");
      await registra(c, "silenciar", u.id, { minutos: input.minutos, tempo: rotuloMin(input.minutos), ate: ate.toISOString(), motivo: input.motivo, denuncia: input.denunciaId ?? null, conexoes });
      return { ok: true, jogador: u.nomeExibicao, ate: ate.getTime(), tempo: rotuloMin(input.minutos) };
    }),

  // ==========================================================================
  // BANIR (por um tempo ou para sempre)
  // ==========================================================================
  banir: adminAutenticado
    .input(z.object({ termo: termoZ, horas: z.number().int().min(0).max(24 * 365), motivo: motivoZ, denunciaId: z.number().int().optional(), confirmacao: z.literal(true) }))
    .mutation(async ({ ctx, input }) => {
      const c = ctxDe(ctx);
      const db = getDb();
      const u = await jogadorOuErro(input.termo);
      naoEmSi(c, u);
      const cargo = c.papel.cargo as Cargo;
      if (input.horas === 0) {
        if (!tem(c, "aplicar_punicoes") || !(cargo === "administrador" || cargo === "dono")) await nega(c, "banir", u.id, "Banir para sempre é só com o Administrador ou o Dono.");
      } else {
        if (!tem(c, "suspender")) await nega(c, "banir", u.id, "Seu cargo não bane.");
        if (!BANIMENTO_OPCOES.some((o) => o.horas === input.horas)) throw new TRPCError({ code: "BAD_REQUEST", message: "Escolha um dos tempos do painel." });
        if (input.horas > SUSPENSAO_MAX_HORAS[cargo]) await nega(c, "banir", u.id, `O seu cargo bane por no máximo ${rotuloHoras(SUSPENSAO_MAX_HORAS[cargo])}.`, { horas: input.horas });
      }
      await exigeAlvoPermitido(c, u.id, "banir");
      const sempre = input.horas === 0;
      const expira = sempre ? null : new Date(Date.now() + input.horas * 3600 * 1000);
      await db.insert(punicoes).values({ usuarioId: u.id, tipo: sempre ? "banimento" : "suspensao", motivo: input.motivo, aplicadaPor: c.usuario.id, expiraEm: expira });
      await db.update(usuarios).set(sempre ? { estado: "banido", suspensoAte: null } : { estado: "suspenso", suspensoAte: expira }).where(eq(usuarios.id, u.id));
      // as sessões do jogo caem (quando o banimento por um tempo acabar, a pessoa entra de novo) e a conta sai das salas na hora
      await db.update(sessoes).set({ revogadaEm: new Date() }).where(eq(sessoes.usuarioId, u.id));
      contaPunida(Number(u.idPublico), expira ? expira.getTime() : Infinity, sempre ? "Esta conta foi banida do RACHA." : "Esta conta foi suspensa no RACHA.");
      await resolveDenuncia(c, input.denunciaId, u.id, "banir");
      await registra(c, sempre ? "banir_para_sempre" : "banir", u.id, { horas: input.horas, tempo: rotuloHoras(input.horas), ate: expira ? expira.toISOString() : null, motivo: input.motivo, denuncia: input.denunciaId ?? null });
      return { ok: true, jogador: u.nomeExibicao, ate: expira ? expira.getTime() : null, tempo: rotuloHoras(input.horas) };
    }),

  // ==========================================================================
  // ADVERTIR · TIRAR DA SALA · TROCAR O NOME · ANOTAR
  // ==========================================================================
  advertir: adminAutenticado
    .input(z.object({ termo: termoZ, motivo: motivoZ, denunciaId: z.number().int().optional(), confirmacao: z.literal(true) }))
    .mutation(async ({ ctx, input }) => {
      const c = ctxDe(ctx);
      const u = await jogadorOuErro(input.termo);
      naoEmSi(c, u);
      if (!tem(c, "advertir")) await nega(c, "advertir", u.id, "Seu cargo não adverte.");
      await exigeAlvoPermitido(c, u.id, "advertir");
      await getDb().insert(punicoes).values({ usuarioId: u.id, tipo: "advertencia", motivo: input.motivo, aplicadaPor: c.usuario.id, expiraEm: null });
      await notifica(u.id, { categoria: "sistema", titulo: "Advertência da equipe do RACHA", corpo: `Você recebeu uma advertência. Motivo: ${input.motivo}. Da próxima vez pode ser silêncio no chat ou banimento.`, refTipo: "advertencia" });
      await resolveDenuncia(c, input.denunciaId, u.id, "advertir");
      await registra(c, "advertir", u.id, { motivo: input.motivo, denuncia: input.denunciaId ?? null });
      return { ok: true, jogador: u.nomeExibicao };
    }),

  expulsar: adminAutenticado
    .input(z.object({ termo: termoZ, motivo: motivoZ, confirmacao: z.literal(true) }))
    .mutation(async ({ ctx, input }) => {
      const c = ctxDe(ctx);
      const u = await jogadorOuErro(input.termo);
      naoEmSi(c, u);
      if (!tem(c, "expulsar")) await nega(c, "expulsar", u.id, "Seu cargo não tira jogador da sala.");
      await exigeAlvoPermitido(c, u.id, "expulsar");
      const saiu = expulsaConta(Number(u.idPublico), input.motivo);
      await registra(c, "expulsar", u.id, { motivo: input.motivo, conexoes: saiu });
      return { ok: true, jogador: u.nomeExibicao, saiu };
    }),

  trocarNome: adminAutenticado
    .input(z.object({ termo: termoZ, motivo: motivoZ, limparFrase: z.boolean().default(false), confirmacao: z.literal(true) }))
    .mutation(async ({ ctx, input }) => {
      const c = ctxDe(ctx);
      const u = await jogadorOuErro(input.termo);
      naoEmSi(c, u);
      if (!tem(c, "trocar_nome")) await nega(c, "trocar_nome", u.id, "Seu cargo não troca nomes.");
      await exigeAlvoPermitido(c, u.id, "trocar_nome");
      const novo = `Jogador${pubDe(u)}`;
      await getDb().update(usuarios).set(input.limparFrase ? { nomeExibicao: novo, bio: null } : { nomeExibicao: novo }).where(eq(usuarios.id, u.id));
      await notifica(u.id, {
        categoria: "sistema", titulo: "A equipe trocou o seu nome",
        corpo: `O nome "${u.nomeExibicao}"${input.limparFrase ? " e a frase do perfil" : ""} não pode ser usado no RACHA. Agora você é ${novo}: escolha outro nome no seu perfil. Motivo: ${input.motivo}`,
        refTipo: "nome",
      });
      await registra(c, "trocar_nome", u.id, { antes: u.nomeExibicao, depois: novo, frase: input.limparFrase ? u.bio ?? null : undefined, motivo: input.motivo });
      return { ok: true, antes: u.nomeExibicao, depois: novo };
    }),

  anotar: adminAutenticado
    .input(z.object({ termo: termoZ, texto: z.string().trim().min(3, "Escreva a nota (3 letras ou mais).").max(500) }))
    .mutation(async ({ ctx, input }) => {
      const c = ctxDe(ctx);
      const u = await jogadorOuErro(input.termo);
      if (!tem(c, "anotar")) await nega(c, "anotar", u.id, "Seu cargo não escreve notas.");
      await getDb().insert(notasStaff).values({ usuarioId: u.id, autorId: c.usuario.id, texto: input.texto });
      await registra(c, "anotar", u.id, { texto: input.texto.slice(0, 160) });
      return { ok: true };
    }),

  // ==========================================================================
  // TIRAR UMA PUNIÇÃO (o silêncio: quem silencia; o banimento e a advertência: Administrador ou o Dono)
  // ==========================================================================
  tirarPunicao: adminAutenticado
    .input(z.object({ punicaoId: z.number().int(), motivo: z.string().trim().max(300).default(""), confirmacao: z.literal(true) }))
    .mutation(async ({ ctx, input }) => {
      const c = ctxDe(ctx);
      const db = getDb();
      const p = await db.query.punicoes.findFirst({ where: and(eq(punicoes.id, input.punicaoId), eq(punicoes.ativa, true)) });
      if (!p) throw new TRPCError({ code: "NOT_FOUND", message: "Essa punição não está valendo." });
      const precisa = p.tipo === "silencio" ? "silenciar" : "aplicar_punicoes";
      if (!tem(c, precisa)) await nega(c, "tirar_punicao", p.usuarioId, p.tipo === "silencio" ? "Seu cargo não tira silêncio." : "Tirar banimento ou advertência é só com o Administrador ou o Dono.", { punicao: p.id, tipo: p.tipo });
      await exigeAlvoPermitido(c, p.usuarioId, "tirar_punicao");
      const cargoDeQuemDeu = (await cargosDe([p.aplicadaPor])).get(p.aplicadaPor);
      if (!podeTirar(c, p, cargoDeQuemDeu)) await nega(c, "tirar_punicao", p.usuarioId, "Quem deu essa punição tem um cargo acima do seu: só ele (ou o Dono) tira.", { punicao: p.id, tipo: p.tipo });
      await db.update(punicoes).set({ ativa: false }).where(eq(punicoes.id, p.id));
      const u = await db.query.usuarios.findFirst({ where: eq(usuarios.id, p.usuarioId) });
      if (p.tipo === "suspensao" || p.tipo === "banimento") {
        await db.update(usuarios).set({ estado: "ativo", suspensoAte: null }).where(eq(usuarios.id, p.usuarioId));
      } else if (p.tipo === "silencio" && u) {
        const outro = await silencioAtivo(u.id); // (sobrou outro silêncio valendo? então ele continua)
        contaSilenciada(Number(u.idPublico), outro ? outro.ate : 0, outro ? outro.motivo : "");
        if (!outro) await notifica(u.id, { categoria: "sistema", titulo: "O seu chat está liberado", corpo: "A equipe do RACHA tirou o seu silêncio. Bom jogo!", refTipo: "silencio" });
      }
      await registra(c, "tirar_punicao", p.usuarioId, { punicao: p.id, tipo: p.tipo, motivoPunicao: p.motivo, motivo: input.motivo || null });
      return { ok: true, tipo: p.tipo, jogador: u?.nomeExibicao ?? null };
    }),

  // ==========================================================================
  // OS PUNIDOS (o que está valendo agora)
  // ==========================================================================
  punidos: adminAutenticado
    .input(z.object({ tipo: z.enum(["todos", "silencio", "banimento"]).default("todos") }))
    .query(async ({ ctx, input }) => {
      const c = ctxDe(ctx);
      exigePermissao(c, "consultar_jogadores");
      const db = getDb();
      const agora = new Date();
      const conds = [];
      if (input.tipo !== "banimento") conds.push(and(eq(punicoes.tipo, "silencio"), gt(punicoes.expiraEm, agora)));
      if (input.tipo !== "silencio") conds.push(and(eq(punicoes.tipo, "suspensao"), gt(punicoes.expiraEm, agora)), eq(punicoes.tipo, "banimento"));
      const lista = await db.query.punicoes.findMany({ where: and(eq(punicoes.ativa, true), or(...conds)), orderBy: [desc(punicoes.criadaEm)], limit: 200 });
      const ids = [...new Set(lista.flatMap((p) => [p.usuarioId, p.aplicadaPor]))];
      const gente = ids.length ? await db.query.usuarios.findMany({ where: inArray(usuarios.id, ids) }) : [];
      const de = (id: number) => gente.find((g) => g.id === id);
      const cg = await cargosDe(ids);
      const meuPeso = CARGO_PESO[c.papel.cargo as Cargo];
      return lista.map((p) => {
        const j = de(p.usuarioId), por = de(p.aplicadaPor);
        const pesoAlvo = cg.get(p.usuarioId) ? CARGO_PESO[cg.get(p.usuarioId) as Cargo] : 0;
        const alvoOk = p.usuarioId !== c.usuario.id && (c.papel.cargo === "dono" ? cg.get(p.usuarioId) !== "dono" : pesoAlvo < meuPeso);
        return {
          id: p.id, tipo: p.tipo, motivo: p.motivo, expiraEm: p.expiraEm, criadaEm: p.criadaEm,
          falta: p.expiraEm ? duracaoTexto(p.expiraEm.getTime() - Date.now()) : null,
          jogador: j ? { nome: j.nomeExibicao, idPublico: pubDe(j), avatarEmoji: j.avatarEmoji } : null,
          por: por ? por.nomeExibicao : `#${p.aplicadaPor}`,
          podeTirar: alvoOk && podeTirar(c, p, cg.get(p.aplicadaPor)),
        };
      });
    }),

  // ==========================================================================
  // AS DENÚNCIAS (com o que foi dito) — a ação direto dela (silenciar/banir/advertir) já deixa a denúncia resolvida
  // ==========================================================================
  denuncias: adminAutenticado
    .input(z.object({ estado: z.enum(["aberta", "em_analise", "resolvida", "arquivada", "todas"]).default("aberta") }))
    .query(async ({ ctx, input }) => {
      const c = ctxDe(ctx);
      const todas = tem(c, "analisar_denuncias");
      const soMinhas = !todas && tem(c, "ver_denuncias_atribuidas");
      if (!todas && !soMinhas) exigePermissao(c, "analisar_denuncias");
      const db = getDb();
      const conds = [];
      if (input.estado !== "todas") conds.push(eq(denuncias.estado, input.estado));
      if (soMinhas) conds.push(eq(denuncias.atribuidaA, c.usuario.id));
      const lista = await db.query.denuncias.findMany({ where: conds.length ? and(...conds) : undefined, orderBy: [desc(denuncias.criadaEm)], limit: 100 });
      const ids = [...new Set(lista.flatMap((d) => [d.autorId, d.alvoId, ...(d.atribuidaA ? [d.atribuidaA] : [])]))];
      const gente = ids.length ? await db.query.usuarios.findMany({ where: inArray(usuarios.id, ids) }) : [];
      const de = (id: number | null) => (id ? gente.find((g) => g.id === id) : undefined);
      return lista.map((d) => {
        const autor = de(d.autorId), alvo = de(d.alvoId), resp = de(d.atribuidaA);
        const ctxD = (d.contexto || {}) as { canal?: string; origem?: string; sala?: string; motivoTexto?: string };
        return {
          id: d.id, motivo: d.motivo, motivoTexto: ctxD.motivoTexto ?? d.motivo, estado: d.estado, criadaEm: d.criadaEm, detalhes: d.detalhes,
          canal: ctxD.canal ?? null, origem: ctxD.origem ?? "perfil", sala: ctxD.sala ?? null,
          autor: autor ? { nome: autor.nomeExibicao, idPublico: pubDe(autor) } : null,
          alvo: alvo ? { nome: alvo.nomeExibicao, idPublico: pubDe(alvo), estado: alvo.estado } : null,
          responsavel: resp ? resp.nomeExibicao : null,
        };
      });
    }),

  denunciaEstado: adminAutenticado
    .input(z.object({ id: z.number().int(), estado: z.enum(["em_analise", "resolvida", "arquivada"]) }))
    .mutation(async ({ ctx, input }) => {
      const c = ctxDe(ctx);
      const db = getDb();
      const d = await db.query.denuncias.findFirst({ where: eq(denuncias.id, input.id) });
      if (!d) throw new TRPCError({ code: "NOT_FOUND", message: "Denúncia não encontrada." });
      const todas = tem(c, "analisar_denuncias");
      if (!todas && !(tem(c, "ver_denuncias_atribuidas") && d.atribuidaA === c.usuario.id)) await nega(c, "denuncia_estado", d.alvoId, "Seu cargo não mexe nessa denúncia.", { denuncia: d.id });
      await db.update(denuncias).set({
        estado: input.estado,
        atribuidaA: d.atribuidaA ?? c.usuario.id,
        resolvidaEm: input.estado === "resolvida" ? new Date() : d.resolvidaEm,
      }).where(eq(denuncias.id, d.id));
      await registra(c, "denuncia_estado", d.alvoId, { denuncia: d.id, estado: input.estado, antes: d.estado });
      return { ok: true };
    }),

  // ==========================================================================
  // MEUS REGISTROS (só o que eu fiz — os da equipe inteira, só o Dono vê)
  // ==========================================================================
  meusRegistros: adminAutenticado
    .input(z.object({ limite: z.number().int().min(1).max(200).default(60) }))
    .query(async ({ ctx, input }) => {
      const c = ctxDe(ctx);
      const db = getDb();
      const lista = await db.query.auditoria.findMany({ where: eq(auditoria.operadorId, c.usuario.id), orderBy: [desc(auditoria.criadoEm), desc(auditoria.id)], limit: input.limite });
      const ids = [...new Set(lista.map((a) => a.alvoId).filter((x): x is number => !!x))];
      const gente = ids.length ? await db.query.usuarios.findMany({ where: inArray(usuarios.id, ids) }) : [];
      return lista.map((a) => {
        const alvo = a.alvoId ? gente.find((g) => g.id === a.alvoId) : undefined;
        return { id: a.id, acao: a.acao, resultado: a.resultado, detalhes: a.detalhes, quando: a.criadoEm, alvo: alvo ? { nome: alvo.nomeExibicao, idPublico: pubDe(alvo) } : null };
      });
    }),
});
