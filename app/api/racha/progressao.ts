// ============================================================================
// RACHA 2.0 — Motor de progressão (somente no servidor)
// Concede XP por eventos legítimos, sobe nível, entrega recompensas de marco,
// desbloqueia conquistas e registra tudo. O navegador NUNCA concede XP direto.
// ============================================================================
import { eq, and } from "drizzle-orm";
import { getDb } from "../queries/connection";
import {
  usuarios,
  historicoNiveis,
  eventosXp,
  itensUsuario,
  conquistasUsuario,
  estatisticas,
  recompensasUsuario,
} from "@db/schema";
import {
  nivelPorXp,
  RECOMPENSAS_MARCO,
  MOLDURAS_NIVEL,
  itemPorCodigo,
  CATALOGO_CONQUISTAS,
  tituloPorNivel,
  type MetricaConquista,
} from "@contracts/racha";

export type ResultadoXp = {
  xpConcedido: number;
  xpTotal: number;
  nivelAntes: number;
  nivelDepois: number;
  subiuNivel: boolean;
  titulo: string;
  itensNovos: string[];
  conquistasNovas: string[];
};

// Entrega um item cosmético (com dedup). Retorna true se era novo.
export async function entregarItem(
  usuarioId: number,
  codigoItem: string,
  origem: string,
  origemDetalhe?: string,
): Promise<boolean> {
  const db = getDb();
  const item = itemPorCodigo(codigoItem);
  if (!item) return false;
  const jaTem = await db.query.itensUsuario.findFirst({
    where: and(eq(itensUsuario.usuarioId, usuarioId), eq(itensUsuario.codigoItem, codigoItem)),
  });
  if (jaTem) return false;
  await db.insert(itensUsuario).values({ usuarioId, codigoItem, origem, origemDetalhe });
  await db.insert(recompensasUsuario).values({
    usuarioId,
    codigoItem,
    origem: origemDetalhe ? `${origem}: ${origemDetalhe}` : origem,
  });
  return true;
}

// Concede XP validado e resolve nível, marcos, molduras e conquistas de nível
export async function concederXp(
  usuarioId: number,
  quantidade: number,
  motivo: string,
  referencia?: string,
): Promise<ResultadoXp> {
  const db = getDb();
  const qtd = Math.max(0, Math.floor(quantidade));

  // Dedup por (usuario, motivo, referencia): envio duplicado não rende de novo
  if (referencia) {
    const dup = await db.query.eventosXp.findFirst({
      where: and(
        eq(eventosXp.usuarioId, usuarioId),
        eq(eventosXp.motivo, motivo),
        eq(eventosXp.referencia, referencia),
      ),
    });
    if (dup) {
      const u = await db.query.usuarios.findFirst({ where: eq(usuarios.id, usuarioId) });
      return {
        xpConcedido: 0,
        xpTotal: u?.xp ?? 0,
        nivelAntes: u?.nivel ?? 1,
        nivelDepois: u?.nivel ?? 1,
        subiuNivel: false,
        titulo: tituloPorNivel(u?.nivel ?? 1),
        itensNovos: [],
        conquistasNovas: [],
      };
    }
  }

  const u = await db.query.usuarios.findFirst({ where: eq(usuarios.id, usuarioId) });
  if (!u) throw new Error("Usuário não encontrado");

  const nivelAntes = u.nivel;
  const xpTotal = u.xp + qtd;
  const nivelDepois = nivelPorXp(xpTotal);

  if (qtd > 0) {
    await db.insert(eventosXp).values({ usuarioId, quantidade: qtd, motivo, referencia: referencia ?? null });
  }
  await db.update(usuarios).set({ xp: xpTotal, nivel: nivelDepois }).where(eq(usuarios.id, usuarioId));

  const itensNovos: string[] = [];

  // Subiu de nível: histórico + recompensas de marco + molduras de progressão
  if (nivelDepois > nivelAntes) {
    for (let n = nivelAntes + 1; n <= nivelDepois; n++) {
      await db.insert(historicoNiveis).values({ usuarioId, nivel: n });
    }
    for (const marco of [...RECOMPENSAS_MARCO, ...MOLDURAS_NIVEL]) {
      if (marco.nivel > nivelAntes && marco.nivel <= nivelDepois) {
        if (await entregarItem(usuarioId, marco.item, "nivel", `Nível ${marco.nivel}`)) {
          itensNovos.push(marco.item);
        }
      }
    }
    // Títulos de carreira ficam equipáveis ao atingir a faixa (viram itens de título)
    const tituloNovo = tituloPorNivel(nivelDepois);
    if (tituloPorNivel(nivelAntes) !== tituloNovo) {
      await db.update(usuarios).set({ tituloEquipado: tituloNovo }).where(eq(usuarios.id, usuarioId));
    }
  }

  const conquistasNovas = await verificarConquistas(usuarioId);

  return {
    xpConcedido: qtd,
    xpTotal,
    nivelAntes,
    nivelDepois,
    subiuNivel: nivelDepois > nivelAntes,
    titulo: tituloPorNivel(nivelDepois),
    itensNovos,
    conquistasNovas,
  };
}

// Desbloqueia conquistas com base nas métricas confiáveis do servidor
export async function verificarConquistas(usuarioId: number): Promise<string[]> {
  const db = getDb();
  const [u, st] = await Promise.all([
    db.query.usuarios.findFirst({ where: eq(usuarios.id, usuarioId) }),
    db.query.estatisticas.findFirst({ where: eq(estatisticas.usuarioId, usuarioId) }),
  ]);
  if (!u || !st) return [];

  const valor = (m: MetricaConquista): number => {
    switch (m) {
      case "partidas": return st.partidas;
      case "gols": return st.gols;
      case "assistencias": return st.assistencias;
      case "golsGinga": return st.golsGinga;
      case "melhorSequencia": return st.melhorSequencia;
      case "nivel": return u.nivel;
    }
  };

  const novas: string[] = [];
  for (const c of CATALOGO_CONQUISTAS) {
    if (valor(c.metrica) < c.marco) continue;
    const ja = await db.query.conquistasUsuario.findFirst({
      where: and(eq(conquistasUsuario.usuarioId, usuarioId), eq(conquistasUsuario.codigo, c.codigo)),
    });
    if (ja) continue;
    await db.insert(conquistasUsuario).values({ usuarioId, codigo: c.codigo });
    // Toda conquista gera um emblema visual próprio
    await garantirEmblema(usuarioId, c.codigo, c.nome, c.emoji);
    novas.push(c.codigo);
  }
  return novas;
}

// Emblemas de conquistas são gerados como itens (representação visual própria)
async function garantirEmblema(usuarioId: number, codigo: string, nome: string, emoji: string) {
  const codigoItem = `emb_${codigo}`;
  const db = getDb();
  const jaTem = await db.query.itensUsuario.findFirst({
    where: and(eq(itensUsuario.usuarioId, usuarioId), eq(itensUsuario.codigoItem, codigoItem)),
  });
  if (!jaTem) {
    await db.insert(itensUsuario).values({
      usuarioId,
      codigoItem,
      origem: "conquista",
      origemDetalhe: `Conquista: ${nome}`,
    });
    await db.insert(recompensasUsuario).values({ usuarioId, codigoItem, origem: `Conquista: ${nome}` });
  }
  return emoji;
}

// Estatísticas pós-partida (servidor) + sequência de vitórias
export async function aplicarEstatisticasPartida(
  usuarioId: number,
  dados: {
    resultado: "vitoria" | "derrota" | "empate";
    gols: number;
    assistencias: number;
    golsGinga: number;
    modo: string;
  },
) {
  const db = getDb();
  const st = await db.query.estatisticas.findFirst({ where: eq(estatisticas.usuarioId, usuarioId) });
  const base = st ?? {
    partidas: 0, vitorias: 0, derrotas: 0, empates: 0, gols: 0, assistencias: 0,
    defesas: 0, dribles: 0, fintas: 0, golsGinga: 0, golsTreino: 0,
    sequenciaVitorias: 0, melhorSequencia: 0, modos: {} as Record<string, number>,
  };
  const sequencia = dados.resultado === "vitoria" ? base.sequenciaVitorias + 1 : dados.resultado === "derrota" ? 0 : base.sequenciaVitorias;
  const modos = { ...(base.modos ?? {}) };
  modos[dados.modo] = (modos[dados.modo] ?? 0) + 1;

  if (!st) {
    await db.insert(estatisticas).values({ usuarioId, modos: {} });
  }
  await db
    .update(estatisticas)
    .set({
      partidas: base.partidas + 1,
      vitorias: base.vitorias + (dados.resultado === "vitoria" ? 1 : 0),
      derrotas: base.derrotas + (dados.resultado === "derrota" ? 1 : 0),
      empates: base.empates + (dados.resultado === "empate" ? 1 : 0),
      gols: base.gols + dados.gols,
      assistencias: base.assistencias + dados.assistencias,
      golsGinga: base.golsGinga + dados.golsGinga,
      sequenciaVitorias: sequencia,
      melhorSequencia: Math.max(base.melhorSequencia, sequencia),
      modos,
      atualizadoEm: new Date(),
    })
    .where(eq(estatisticas.usuarioId, usuarioId));
}
