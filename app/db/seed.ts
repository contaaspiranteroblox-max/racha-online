import { getDb } from "../api/queries/connection";
import { usuarios, contadores, cargos, estatisticas, itensUsuario, selos } from "./schema";
import { eq } from "drizzle-orm";
import { scryptSync, randomBytes, randomUUID } from "node:crypto";

// ============================================================================
// SEED RACHA 2.0
// - Garante o contador de IDs públicos (sem reuso).
// - Cria a conta do DONO com o ID público 000001 (reservado antes do lançamento).
// - Credenciais via env RACHA_OWNER_USERNAME / RACHA_OWNER_PASSWORD.
//   Padrão de desenvolvimento: dono / Racha@Dono1  (TROQUE EM PRODUÇÃO!)
// ============================================================================

function hashSenha(senha: string): string {
  const sal = randomBytes(16).toString("hex");
  const hash = scryptSync(senha, sal, 64).toString("hex");
  return `scrypt:${sal}:${hash}`;
}

async function seed() {
  const db = getDb();
  console.log("Semeando o RACHA...");

  // Contador de IDs públicos
  await db
    .insert(contadores)
    .values({ nome: "id_publico", valor: 0 })
    .onDuplicateKeyUpdate({ set: { nome: "id_publico" } });

  const username = (process.env.RACHA_OWNER_USERNAME || "dono").toLowerCase();
  const senha = process.env.RACHA_OWNER_PASSWORD || "Racha@Dono1";

  const existente = await db.query.usuarios.findFirst({ where: eq(usuarios.username, username) });
  if (existente) {
    console.log(`Conta do Dono (${username}) já existe — ID ${existente.idPublico}. Garantindo cargo, selos e itens...`);
    const donoId = existente.id;
    await db.insert(cargos).values({ usuarioId: donoId, cargo: "dono", concedidoPor: donoId }).onDuplicateKeyUpdate({ set: { cargo: "dono" } });
    await db.insert(estatisticas).values({ usuarioId: donoId, modos: {} }).onDuplicateKeyUpdate({ set: { usuarioId: donoId } });
    await db.insert(selos).values([
      { usuarioId: donoId, selo: "criador", concedidoPor: donoId },
      { usuarioId: donoId, selo: "verificado", concedidoPor: donoId },
    ]).onDuplicateKeyUpdate({ set: { usuarioId: donoId } });
    console.log("✔ Dono verificado.");
  } else {
    // Reserva o ID 000001
    await db
      .insert(contadores)
      .values({ nome: "id_publico", valor: 1 })
      .onDuplicateKeyUpdate({ set: { valor: 1 } });

    const [res] = await db.insert(usuarios).values({
      uuid: randomUUID(),
      idPublico: 1,
      username,
      nomeExibicao: "Criador do RACHA",
      senhaHash: hashSenha(senha),
      xp: 0,
      nivel: 1,
    });
    const donoId = Number(res.insertId);

    await db.insert(cargos).values({ usuarioId: donoId, cargo: "dono", concedidoPor: donoId });
    await db.insert(estatisticas).values({ usuarioId: donoId, modos: {} });
    await db.insert(itensUsuario).values([
      { usuarioId: donoId, codigoItem: "skin_padrao", origem: "inicial" },
      { usuarioId: donoId, codigoItem: "banner_laje_noturna", origem: "inicial" },
      { usuarioId: donoId, codigoItem: "banner_fundador", origem: "admin", origemDetalhe: "Conta do Criador" },
      { usuarioId: donoId, codigoItem: "moldura_fundador", origem: "admin", origemDetalhe: "Conta do Criador" },
      { usuarioId: donoId, codigoItem: "titulo_fundador", origem: "admin", origemDetalhe: "Conta do Criador" },
      { usuarioId: donoId, codigoItem: "skin_fundador", origem: "admin", origemDetalhe: "Conta do Criador" },
    ]);
    await db.insert(selos).values([
      { usuarioId: donoId, selo: "criador", concedidoPor: donoId },
      { usuarioId: donoId, selo: "verificado", concedidoPor: donoId },
    ]);
    await db.update(usuarios).set({ tituloEquipado: "Fundador", molduraEquipada: "moldura_fundador", bannerEquipado: "banner_fundador" }).where(eq(usuarios.id, donoId));

    console.log(`✔ Conta do Dono criada: usuário "${username}" · ID público 000001`);
    if (!process.env.RACHA_OWNER_PASSWORD) {
      console.log(`⚠ Senha padrão de desenvolvimento: ${senha} — defina RACHA_OWNER_PASSWORD em produção!`);
    }
  }

  console.log("Seed concluído.");
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
