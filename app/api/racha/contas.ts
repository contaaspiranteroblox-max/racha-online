// ============================================================================
// RACHA v88.1 — AS CONTAS PELO DONO (o que o authRouter, o RACHA CONTROL › Contas e o boot dividem)
//  · o CADASTRO FECHADO: só o Dono cria contas novas (RACHA CONTROL › Contas). Sem nada no banco o cadastro fica FECHADO;
//    o Dono abre e fecha no painel (vale o que estiver no banco). Para os testes e o computador de quem desenvolve, sem nada
//    no banco vale RACHA_CADASTRO=aberto|fechado;
//  · o NÚMERO DA CONTA (o ID público 000002, 000003…) sai de um lugar só, numa transação: o LAST_INSERT_ID do MySQL é da
//    CONEXÃO e o banco usa um pool — o UPDATE e o SELECT precisam ir pela mesma conexão (antes iam soltos);
//  · a CONTA DO DONO (000001) com a senha da configuração do servidor (RACHA_OWNER_PASSWORD), conferida no boot. A senha do
//    manual (Racha@Dono1, escrita no repositório) não abre o RACHA CONTROL nem a conta do Dono;
//  · o ZERAR CONTAS: apaga todas as contas menos a do Dono, e os números voltam a contar do 000002.
// ============================================================================
import { randomInt } from "node:crypto";
import { eq, ne, and, or, isNull, isNotNull, notInArray, sql } from "drizzle-orm";
import { getDb } from "../queries/connection";
import {
  usuarios, contadores, sessoes, cargos, totp, selos, estatisticas, historicoNiveis, eventosXp, xpDiario, partidas, ranqueada,
  ranqueadaEventos, progressoJogo, itensUsuario, conquistasUsuario, amizades, pedidosAmizade, bloqueios, denuncias, punicoes,
  distribuicaoItens, recompensasUsuario, clubes, clubeMembros, clubeConvites, recuperacaoTokens, carteiras, transacoes,
  aprovacoes, clubePedidos, mensagens, correio, missoesProgresso, eventosProgresso, passeTemporada,
} from "@db/schema";
import { hashSenha, verificarSenha, novoUuid } from "./security";

type Db = ReturnType<typeof getDb>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type Conn = Db | Tx;

export const ID_DONO = 1; // o 000001
export const SENHA_DO_MANUAL = "Racha@Dono1"; // a senha de desenvolvimento escrita no repositório (pública)
export const ehSenhaDoManual = (s: string) => s === SENHA_DO_MANUAL;
export const AVISO_SENHA_DO_MANUAL =
  "A conta do Dono ainda está com a senha do manual (Racha@Dono1), que é pública. Defina RACHA_OWNER_PASSWORD no servidor e reinicie a plataforma: a senha do Dono passa a ser essa.";
export const AVISO_SENHA_DO_AMBIENTE =
  "A senha do Dono vem da configuração do servidor (RACHA_OWNER_PASSWORD). Para trocar, mude a variável e reinicie a plataforma.";

// ---------------------------------------------------------------- os contadores (a tabela contadores: nome → número)
export async function leContador(nome: string, db: Conn = getDb()): Promise<number | null> {
  const r = await db.query.contadores.findFirst({ where: eq(contadores.nome, nome) });
  return r ? Number(r.valor) : null;
}
export async function poeContador(nome: string, valor: number, db: Conn = getDb()): Promise<void> {
  const v = Math.max(0, Math.floor(valor));
  await db.insert(contadores).values({ nome, valor: v }).onDuplicateKeyUpdate({ set: { valor: v } });
}

// ---------------------------------------------------------------- o cadastro (aberto ou fechado)
export type EstadoCadastro = { aberto: boolean; fonte: "painel" | "ambiente" | "padrao" };
export async function cadastroAberto(db: Conn = getDb()): Promise<EstadoCadastro> {
  const v = await leContador("cadastro_aberto", db);
  if (v !== null) return { aberto: v === 1, fonte: "painel" };
  const e = (process.env.RACHA_CADASTRO || "").trim().toLowerCase();
  if (["aberto", "1", "sim", "true"].includes(e)) return { aberto: true, fonte: "ambiente" };
  if (["fechado", "0", "nao", "não", "false"].includes(e)) return { aberto: false, fonte: "ambiente" };
  return { aberto: false, fonte: "padrao" };
}
export async function definirCadastro(aberto: boolean, db: Conn = getDb()): Promise<void> {
  await poeContador("cadastro_aberto", aberto ? 1 : 0, db);
}
export const MSG_CADASTRO_FECHADO =
  "O cadastro está fechado: as contas novas são criadas pelo dono do RACHA. Peça a sua para quem cuida do jogo — depois é só entrar com o usuário e a senha que ele mandar.";

// ---------------------------------------------------------------- o número da próxima conta
async function umNumero(tx: Conn): Promise<number> {
  await tx.insert(contadores).values({ nome: "id_publico", valor: ID_DONO }).onDuplicateKeyUpdate({ set: { nome: "id_publico" } });
  await tx.execute(sql`UPDATE contadores SET valor = LAST_INSERT_ID(valor + 1) WHERE nome = 'id_publico'`);
  const [linhas] = await tx.execute(sql`SELECT LAST_INSERT_ID() AS v`);
  const v = Number((linhas as unknown as { v: number | string }[])[0]?.v ?? 0);
  if (!Number.isFinite(v) || v <= ID_DONO) throw new Error("contador de IDs públicos sem valor");
  return v;
}
// O próximo ID público livre (gerado SÓ pelo servidor). Se o contador ficou para trás de um número já em uso, pula.
export async function proximoIdPublico(): Promise<number> {
  const db = getDb();
  for (let tentativa = 0; tentativa < 50; tentativa++) {
    const v = await db.transaction(async (tx) => umNumero(tx));
    const ja = await db.query.usuarios.findFirst({ where: eq(usuarios.idPublico, v), columns: { id: true } });
    if (!ja) return v;
  }
  throw new Error("não achei um ID público livre (confira o contador id_publico)");
}
// O número que a próxima conta vai receber (só para mostrar no painel; quem dá o número é o proximoIdPublico)
export async function idDaProximaConta(): Promise<number> {
  return Math.max(ID_DONO, (await leContador("id_publico")) ?? ID_DONO) + 1;
}

// ---------------------------------------------------------------- quando as contas foram zeradas (ms; null = nunca)
export async function contasZeradasEm(db: Conn = getDb()): Promise<number | null> {
  const v = await leContador("contas_zeradas_em", db);
  return v && v > 0 ? v : null;
}

// ---------------------------------------------------------------- a senha gerada (fácil de ditar: sem 0/O, 1/l/I)
const LETRAS = "abcdefghjkmnpqrstuvwxyz", MAIUSCULAS = "ABCDEFGHJKLMNPQRSTUVWXYZ", NUMEROS = "23456789";
export function senhaGerada(): string {
  const todos = LETRAS + MAIUSCULAS + NUMEROS;
  for (;;) {
    const s = [0, 1, 2].map(() => Array.from({ length: 4 }, () => todos[randomInt(todos.length)]).join("")).join("-");
    if (/[a-z]/.test(s) && /[A-Z]/.test(s) && /[2-9]/.test(s)) return s; // (letra minúscula, maiúscula e número)
  }
}

// ---------------------------------------------------------------- a conta do Dono (no boot da plataforma)
// · sem o 000001: cria com RACHA_OWNER_USERNAME (padrão "dono") e RACHA_OWNER_PASSWORD — nunca com a senha do manual;
// · com o 000001 e a variável definida: a senha do Dono passa a ser a da variável (se mudou: as sessões do Dono caem e o 2FA do
//   painel é zerado — quem configura de novo, no primeiro login do painel, é quem tem a senha nova);
// · o cargo de Dono no 000001 e o contador de IDs nunca atrás do maior número em uso.
export type ResultadoDono = { existe: boolean; criado: boolean; senhaAplicada: boolean; senhaDoManual: boolean; avisos: string[] };
export async function garanteDono(log: (t: string) => void = (t) => console.log(t)): Promise<ResultadoDono> {
  const db = getDb();
  const out: ResultadoDono = { existe: false, criado: false, senhaAplicada: false, senhaDoManual: false, avisos: [] };
  const aviso = (t: string) => { out.avisos.push(t); log("⚠ " + t); };
  const senhaEnv = process.env.RACHA_OWNER_PASSWORD || "";
  const senhaOk = senhaValidaDoAmbiente(senhaEnv);
  if (senhaEnv && !senhaOk) aviso("RACHA_OWNER_PASSWORD não foi usada: precisa de 8 a 100 caracteres e não pode ser a senha do manual (Racha@Dono1).");
  let u = await db.query.usuarios.findFirst({ where: eq(usuarios.idPublico, ID_DONO) });
  if (!u) {
    const username = (process.env.RACHA_OWNER_USERNAME || "dono").trim().toLowerCase();
    if (!senhaOk) {
      aviso("Ainda não existe a conta do Dono (000001). Defina RACHA_OWNER_PASSWORD (e, se quiser, RACHA_OWNER_USERNAME) e reinicie: ela é criada sozinha.");
      return out;
    }
    if (!/^[a-z0-9_.]{3,24}$/.test(username)) { aviso("RACHA_OWNER_USERNAME inválido (3 a 24: letras minúsculas, números, _ ou .)."); return out; }
    if (await db.query.usuarios.findFirst({ where: eq(usuarios.username, username), columns: { id: true } })) {
      aviso(`O usuário "${username}" já existe com outro ID: a conta do Dono (000001) não foi criada. Use outro RACHA_OWNER_USERNAME.`);
      return out;
    }
    const [res] = await db.insert(usuarios).values({
      uuid: novoUuid(), idPublico: ID_DONO, username, nomeExibicao: "Criador do RACHA", senhaHash: hashSenha(senhaEnv), xp: 0, nivel: 1,
      tituloEquipado: "Fundador", molduraEquipada: "moldura_fundador", bannerEquipado: "banner_fundador",
    });
    const id = Number(res.insertId);
    await db.insert(estatisticas).values({ usuarioId: id, modos: {} });
    await db.insert(itensUsuario).values([
      { usuarioId: id, codigoItem: "skin_padrao", origem: "inicial" },
      { usuarioId: id, codigoItem: "banner_laje_noturna", origem: "inicial" },
      { usuarioId: id, codigoItem: "banner_fundador", origem: "admin", origemDetalhe: "Conta do Criador" },
      { usuarioId: id, codigoItem: "moldura_fundador", origem: "admin", origemDetalhe: "Conta do Criador" },
      { usuarioId: id, codigoItem: "titulo_fundador", origem: "admin", origemDetalhe: "Conta do Criador" },
      { usuarioId: id, codigoItem: "skin_fundador", origem: "admin", origemDetalhe: "Conta do Criador" },
    ]);
    await db.insert(selos).values([
      { usuarioId: id, selo: "criador", concedidoPor: id },
      { usuarioId: id, selo: "verificado", concedidoPor: id },
    ]);
    u = await db.query.usuarios.findFirst({ where: eq(usuarios.id, id) });
    out.criado = true;
    log(`✔ Conta do Dono criada: usuário "${username}" · ID 000001 (a senha é a de RACHA_OWNER_PASSWORD).`);
  } else if (senhaOk && !verificarSenha(senhaEnv, u.senhaHash)) {
    await db.update(usuarios).set({ senhaHash: hashSenha(senhaEnv) }).where(eq(usuarios.id, u.id));
    await db.update(sessoes).set({ revogadaEm: new Date() }).where(and(eq(sessoes.usuarioId, u.id), isNull(sessoes.revogadaEm)));
    await db.delete(totp).where(eq(totp.usuarioId, u.id));
    out.senhaAplicada = true;
    log("✔ A senha do Dono (000001) agora é a de RACHA_OWNER_PASSWORD. As sessões antigas do Dono foram encerradas e o 2FA do painel foi zerado: configure de novo no primeiro login do RACHA CONTROL.");
  }
  if (!u) return out;
  out.existe = true;
  if (!senhaOk && verificarSenha(SENHA_DO_MANUAL, u.senhaHash)) { out.senhaDoManual = true; aviso(AVISO_SENHA_DO_MANUAL); }
  await db.insert(cargos).values({ usuarioId: u.id, cargo: "dono", concedidoPor: u.id }).onDuplicateKeyUpdate({ set: { cargo: "dono" } });
  // o contador nunca fica atrás do maior número em uso (senão o proximoIdPublico teria de pular um por um)
  const [l] = await db.execute(sql`SELECT MAX(id_publico) AS m FROM usuarios`);
  const maior = Number((l as unknown as { m: number | string | null }[])[0]?.m ?? ID_DONO) || ID_DONO;
  const cont = await leContador("id_publico");
  if (cont === null || cont < maior) await poeContador("id_publico", maior);
  return out;
}
// É a conta do Dono? (o 000001 — o mesmo critério do EXCLUIR A CONTA)
export const ehContaDoDono = (u: { idPublico: number | string }) => Number(u.idPublico) === ID_DONO;
// a senha do Dono está presa na configuração do servidor? (o mesmo critério do boot: a que o garanteDono aplica)
export function senhaValidaDoAmbiente(s: string): boolean {
  return s.length >= 8 && s.length <= 100 && !ehSenhaDoManual(s);
}
export const senhaDoDonoNoAmbiente = () => senhaValidaDoAmbiente(process.env.RACHA_OWNER_PASSWORD || "");
// v88.1: a conta foi criada depois do último ZERAR CONTAS? O zerar apaga TODAS as contas menos a 000001, então toda conta
// que existe — fora a do Dono — nasceu depois dele (sem comparar relógios: o do banco, o do servidor e o do aparelho podem
// não bater). O jogo usa para saber se o que o aparelho guardava para este número era de uma conta apagada.
export const nasceuDepoisDoZerar = (u: { idPublico: number | string }, zeradoEm: number | null) => zeradoEm !== null && !ehContaDoDono(u);

// ---------------------------------------------------------------- ZERAR CONTAS
// Apaga TODAS as contas menos a do Dono (quem pediu, no RACHA CONTROL) e tudo o que era delas; o Dono fica com o 000001 e
// os números voltam a contar do 000002. Numa transação: ou apaga tudo, ou nada. O que fica: a conta do Dono (com o
// progresso, a carteira, os itens, as estatísticas e os clubes dele — sem os outros membros), a auditoria, os eventos, as
// cartas para todos e o registro das distribuições (os números internos das contas apagadas nunca voltam a ser usados).
export type ResultadoZerar = { apagadas: number; pubs: string[]; proximo: number; em: number };
export async function zerarContas(donoId: number): Promise<ResultadoZerar> {
  const db = getDb();
  let outras: { id: number; idPublico: number }[] = [];
  await db.transaction(async (tx) => {
    // (quem fica tem de ser a conta 000001: chamado com outra, o zerar apagaria o Dono)
    const dono = await tx.query.usuarios.findFirst({ where: eq(usuarios.id, donoId), columns: { id: true, idPublico: true } });
    if (!dono || !ehContaDoDono(dono)) throw new Error("zerarContas: quem fica precisa ser a conta 000001");
    outras = await tx.query.usuarios.findMany({ where: ne(usuarios.id, donoId), columns: { id: true, idPublico: true } });
    // 1) o que é de cada conta (a coluna usuario_id): fica só o do Dono
    const porConta = [
      [sessoes, sessoes.usuarioId], [cargos, cargos.usuarioId], [totp, totp.usuarioId], [selos, selos.usuarioId],
      [estatisticas, estatisticas.usuarioId], [historicoNiveis, historicoNiveis.usuarioId], [eventosXp, eventosXp.usuarioId],
      [xpDiario, xpDiario.usuarioId], [partidas, partidas.usuarioId], [ranqueada, ranqueada.usuarioId],
      [ranqueadaEventos, ranqueadaEventos.usuarioId], [progressoJogo, progressoJogo.usuarioId], [itensUsuario, itensUsuario.usuarioId],
      [conquistasUsuario, conquistasUsuario.usuarioId], [punicoes, punicoes.usuarioId], [distribuicaoItens, distribuicaoItens.usuarioId],
      [recompensasUsuario, recompensasUsuario.usuarioId], [recuperacaoTokens, recuperacaoTokens.usuarioId], [carteiras, carteiras.usuarioId],
      [transacoes, transacoes.usuarioId], [missoesProgresso, missoesProgresso.usuarioId], [eventosProgresso, eventosProgresso.usuarioId],
      [passeTemporada, passeTemporada.usuarioId], [correio, correio.usuarioId], [mensagens, mensagens.usuarioId],
      [clubeMembros, clubeMembros.usuarioId],
    ] as const;
    for (const [tabela, coluna] of porConta) await tx.delete(tabela).where(ne(coluna, donoId));
    // 2) o que liga duas contas (sempre tem uma que sai). (Os limites de tentativa ficam: são janelas curtas, e o selo:… de
    // lá é a marca de uso único do resultado online — apagar deixaria usar o mesmo resultado de novo.)
    for (const tabela of [amizades, pedidosAmizade, bloqueios, denuncias, clubeConvites, clubePedidos]) await tx.delete(tabela);
    await tx.delete(aprovacoes).where(or(ne(aprovacoes.alvoUsuarioId, donoId), ne(aprovacoes.pedidoPorId, donoId)));
    // 3) o que o Dono guardava das outras contas: as mensagens delas e quem jogou junto nas partidas dele (os números voltam)
    await tx.delete(mensagens).where(and(isNotNull(mensagens.deId), ne(mensagens.deId, donoId)));
    await tx.update(partidas).set({ jogadores: null }).where(eq(partidas.usuarioId, donoId));
    // 4) os clubes: ficam os do Dono (só com ele); os outros saem
    const meus = (await tx.query.clubes.findMany({ where: eq(clubes.donoId, donoId), columns: { id: true } })).map((c) => c.id);
    if (meus.length) {
      await tx.delete(clubes).where(notInArray(clubes.id, meus));
      await tx.delete(clubeMembros).where(notInArray(clubeMembros.clubeId, meus));
    } else {
      await tx.delete(clubes);
      await tx.delete(clubeMembros);
    }
    // 5) as contas e os números
    await tx.delete(usuarios).where(ne(usuarios.id, donoId));
    await tx.update(usuarios).set({ idPublico: ID_DONO }).where(eq(usuarios.id, donoId));
    await poeContador("id_publico", ID_DONO, tx);
    await poeContador("contas_zeradas_em", Date.now(), tx);
  });
  // a hora que vale para o bilhete das salas: depois do commit (+1 s), para o bilhete assinado DURANTE o zerar também cair
  const em = Date.now() + 1000;
  await poeContador("contas_zeradas_em", em);
  return { apagadas: outras.length, pubs: outras.map((o) => String(o.idPublico).padStart(6, "0")), proximo: ID_DONO + 1, em };
}
