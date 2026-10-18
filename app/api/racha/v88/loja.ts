// ============================================================================
// RACHA v88 — a LOJA e a CARTEIRA da conta: o saldo oficial (moedas e gemas) e o inventário moram aqui. Toda compra é
// conferida no servidor pelo catálogo (contracts/catalogo88.json e as peças tiradas do jogo): o preço é o daqui (o jogo
// manda o preço que ele mostrou só para o servidor recusar se mudou), o saldo não fica negativo (UPDATE com guarda) e o
// item entra no inventário na MESMA transação do pagamento. Equipar confere a posse. Trocar gemas por moedas usa a tabela
// do jogo. Nada aqui muda a física: são cosméticos.
// ============================================================================
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, lte, gt } from "drizzle-orm";
import { createRouter } from "../../middleware";
import { getDb } from "../../queries/connection";
import { itensUsuario, usuarios, eventos, transacoes } from "@db/schema";
import { autenticado, exigeLimite } from "../guard";
import { contaDe, equipadosDe, empurraRelacoes } from "./comum";
import { garanteCarteira, movimentar, entregarItens } from "../economia";
import { CATALOGO, precoDe, ofertasDaSemana, destaquesDoDia, podeEquipar, pacoteCat, pecaDoCodigo, codigoPeca, itemCat, nomeDoCodigo, segundaUtc, diaUtc, type Venda } from "@contracts/v88";

// as ofertas que o RACHA CONTROL pôs num evento temporário ativo (config.ofertas: {"codigo": desconto%})
export async function ofertasDosEventos(): Promise<Record<string, number>> {
  const agora = new Date();
  const l = await getDb().query.eventos.findMany({ where: and(eq(eventos.ativo, true), eq(eventos.tipo, "temporario"), lte(eventos.inicio, agora), gt(eventos.fim, agora)), limit: 10 });
  const out: Record<string, number> = {};
  for (const ev of l) {
    const o = (ev.config as { ofertas?: Record<string, unknown> }).ofertas;
    if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) if (precoDe(k)) out[k] = Math.max(0, Math.min(90, Math.floor(Number(v) || 0)));
  }
  return out;
}

async function inventarioDe(usuarioId: number): Promise<Set<string>> {
  return new Set((await getDb().query.itensUsuario.findMany({ where: eq(itensUsuario.usuarioId, usuarioId), columns: { codigoItem: true } })).map((i) => i.codigoItem));
}

export const lojaRouter = createRouter({
  // a carteira, o que você tem, o que está equipado e a vitrine de hoje (destaques e ofertas com o preço de verdade)
  estado: autenticado.query(async ({ ctx }) => {
    const u = contaDe(ctx);
    const carteira = await garanteCarteira(u.id);
    const inv = await inventarioDe(u.id);
    const extra = await ofertasDosEventos();
    const agora = new Date();
    const vendas = (l: string[]) => l.map((c) => precoDe(c, agora, extra)).filter((v): v is Venda => !!v);
    const ofertas = [...new Set([...ofertasDaSemana(agora), ...Object.keys(extra)])];
    return {
      carteira: { moedas: carteira.moedas, gemas: carteira.gemas },
      inventario: [...inv],
      equipados: equipadosDe(u),
      destaques: vendas(destaquesDoDia(agora)),
      ofertas: vendas(ofertas),
      trocas: CATALOGO.trocas,
      dia: diaUtc(agora), semana: segundaUtc(agora), versaoCatalogo: CATALOGO.versao,
    };
  }),

  carteira: autenticado.query(async ({ ctx }) => {
    const c = await garanteCarteira(contaDe(ctx).id);
    return { moedas: c.moedas, gemas: c.gemas };
  }),

  // o histórico da carteira (as últimas movimentações: quem quiser conferir de onde veio cada moeda)
  extrato: autenticado.query(async ({ ctx }) => {
    const u = contaDe(ctx);
    const l = await getDb().query.transacoes.findMany({ where: eq(transacoes.usuarioId, u.id), orderBy: (t, { desc }) => [desc(t.criadaEm), desc(t.id)], limit: 40 });
    return l.map((t) => ({ quando: t.criadaEm, moedas: t.moedasDelta, gemas: t.gemasDelta, moedasDepois: t.moedasDepois, gemasDepois: t.gemasDepois, tipo: t.tipo, motivo: t.motivo }));
  }),

  inventario: autenticado.query(async ({ ctx }) => {
    const u = contaDe(ctx);
    const l = await getDb().query.itensUsuario.findMany({ where: eq(itensUsuario.usuarioId, u.id) });
    return l.map((i) => {
      const it = itemCat(i.codigoItem), p = pecaDoCodigo(i.codigoItem);
      return { codigo: i.codigoItem, nome: nomeDoCodigo(i.codigoItem), tipo: it ? it.tipo : p ? "peca" : "outro", raridade: it ? it.raridade : p ? p.raridade : "", origem: i.origem, detalhe: i.origemDetalhe, obtidoEm: i.obtidoEm };
    });
  }),

  // comprar um item, uma peça ou um pacote: o preço mostrado tem que ser o de agora (senão o servidor recusa e manda o novo)
  comprar: autenticado
    .input(z.object({ codigo: z.string().min(2).max(40), preco: z.object({ moedas: z.number().int().min(0), gemas: z.number().int().min(0) }) }))
    .mutation(async ({ ctx, input }) => {
      const u = contaDe(ctx);
      await exigeLimite(`compra:${u.id}`, 30, 60 * 1000, "Calma: muitas compras seguidas.");
      const v = precoDe(input.codigo, new Date(), await ofertasDosEventos());
      if (!v) throw new TRPCError({ code: "NOT_FOUND", message: "Esse item não está à venda." });
      if (v.moedas !== input.preco.moedas || v.gemas !== input.preco.gemas) {
        throw new TRPCError({ code: "CONFLICT", message: `O preço mudou: agora é ${v.moedas ? v.moedas + " moedas" : v.gemas + " gemas"}. Confira e compre de novo.` });
      }
      const inv = await inventarioDe(u.id);
      let codigos: string[];
      if (v.tipo === "pacote") {
        codigos = pacoteCat(input.codigo)!.itens;
        if (codigos.every((c) => inv.has(c))) throw new TRPCError({ code: "CONFLICT", message: "Você já tem tudo o que vem neste pacote." });
      } else {
        if (inv.has(input.codigo)) throw new TRPCError({ code: "CONFLICT", message: "Você já tem esse item." });
        codigos = [input.codigo];
      }
      const r = await getDb().transaction(async (tx) => {
        const m = await movimentar({ usuarioId: u.id, moedasDelta: -v.moedas, gemasDelta: -v.gemas, tipo: "compra", motivo: "Loja: " + v.nome, refTipo: v.tipo, refId: input.codigo, operacaoId: `compra:${u.id}:${input.codigo}` }, tx);
        if (!m.ok) throw new TRPCError({ code: "PRECONDITION_FAILED", message: m.erro === "Saldo insuficiente." ? "Saldo insuficiente." : m.erro });
        if (m.duplicada) throw new TRPCError({ code: "CONFLICT", message: "Essa compra já foi feita." });
        const novos = await entregarItens(u.id, codigos, "compra", "Loja: " + v.nome, tx);
        return { carteira: { moedas: m.moedas, gemas: m.gemas }, itens: novos };
      });
      return { ok: true, codigo: input.codigo, nome: v.nome, pago: { moedas: v.moedas, gemas: v.gemas }, ...r };
    }),

  // as peças que faltam para uma tampinha (o editor do jogo): todas de uma vez, pelo preço do catálogo
  comprarPecas: autenticado
    .input(z.object({ pecas: z.array(z.string().regex(/^[bfpi]:[a-z0-9-]{2}$/)).min(1).max(4), total: z.object({ moedas: z.number().int().min(0), gemas: z.number().int().min(0) }) }))
    .mutation(async ({ ctx, input }) => {
      const u = contaDe(ctx);
      await exigeLimite(`compra:${u.id}`, 30, 60 * 1000, "Calma: muitas compras seguidas.");
      const inv = await inventarioDe(u.id);
      const extra = await ofertasDosEventos();
      const faltam = [...new Set(input.pecas)].map((k) => codigoPeca(k)).filter((c) => !inv.has(c));
      if (!faltam.length) return { ok: true, itens: [], pago: { moedas: 0, gemas: 0 }, carteira: await garanteCarteira(u.id).then((c) => ({ moedas: c.moedas, gemas: c.gemas })) };
      let moedas = 0, gemas = 0;
      for (const c of faltam) {
        const v = precoDe(c, new Date(), extra);
        if (!v) { if (pecaDoCodigo(c)) continue; throw new TRPCError({ code: "NOT_FOUND", message: "Peça que não existe: " + c }); }
        moedas += v.moedas; gemas += v.gemas;
      }
      if (moedas !== input.total.moedas || gemas !== input.total.gemas) throw new TRPCError({ code: "CONFLICT", message: `O preço mudou: agora é ${moedas} moedas e ${gemas} gemas. Confira e compre de novo.` });
      const pagas = faltam.filter((c) => !!precoDe(c, new Date(), extra));
      const r = await getDb().transaction(async (tx) => {
        let carteira = await garanteCarteira(u.id, tx);
        if (moedas || gemas) {
          const m = await movimentar({ usuarioId: u.id, moedasDelta: -moedas, gemasDelta: -gemas, tipo: "compra", motivo: "Peças da tampinha: " + pagas.map((c) => nomeDoCodigo(c)).join(", ").slice(0, 160), refTipo: "pecas", refId: pagas.join(",").slice(0, 60), operacaoId: `pecas:${u.id}:${pagas.slice().sort().join(",")}`.slice(0, 80) }, tx);
          if (!m.ok) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Saldo insuficiente." });
          if (m.duplicada) throw new TRPCError({ code: "CONFLICT", message: "Essa compra já foi feita." });
          carteira = { usuarioId: u.id, moedas: m.moedas, gemas: m.gemas };
        }
        const novos = await entregarItens(u.id, pagas, "compra", "Editor da tampinha", tx);
        return { carteira: { moedas: carteira.moedas, gemas: carteira.gemas }, itens: novos };
      });
      return { ok: true, pago: { moedas, gemas }, ...r };
    }),

  equipar: autenticado
    .input(z.object({ tipo: z.enum(["bola", "efeito", "comemoracao", "gol", "banner", "avatar"]), codigo: z.string().min(2).max(40) }))
    .mutation(async ({ ctx, input }) => {
      const u = contaDe(ctx);
      const inv = await inventarioDe(u.id);
      if (!podeEquipar(input.tipo, input.codigo, (c) => inv.has(c))) throw new TRPCError({ code: "FORBIDDEN", message: "Você ainda não tem esse item." });
      const e = { ...equipadosDe(u), [input.tipo]: input.codigo };
      await getDb().update(usuarios).set({ equipados: e }).where(eq(usuarios.id, u.id));
      await empurraRelacoes(u.id);                             // (o servidor das salas mostra o cosmético certo para os outros)
      return { ok: true, equipados: e };
    }),

  // trocar gemas por moedas (a tabela do jogo); o nonce evita a troca dobrada por toque duplo
  trocar: autenticado
    .input(z.object({ id: z.string().max(20), nonce: z.string().min(8).max(40) }))
    .mutation(async ({ ctx, input }) => {
      const u = contaDe(ctx);
      await exigeLimite(`troca:${u.id}`, 20, 60 * 1000, "Calma: muitas trocas seguidas.");
      const t = CATALOGO.trocas.find((x) => x.id === input.id);
      if (!t) throw new TRPCError({ code: "NOT_FOUND", message: "Troca que não existe." });
      const m = await movimentar({ usuarioId: u.id, moedasDelta: t.moedas, gemasDelta: -t.gemas, tipo: "troca", motivo: `Troca: ${t.gemas} gemas por ${t.moedas} moedas`, refTipo: "troca", refId: t.id, operacaoId: `troca:${u.id}:${input.nonce}` });
      if (!m.ok) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Gemas insuficientes." });
      return { ok: true, duplicada: m.duplicada, carteira: { moedas: m.moedas, gemas: m.gemas } };
    }),
});
