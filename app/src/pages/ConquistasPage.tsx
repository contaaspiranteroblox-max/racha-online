// ============================================================================
// RACHA 2.0 — Conquistas e Inventário
// ============================================================================
import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { useAuth, INFO_CATEGORIA, INFO_RARIDADE } from "@/lib/racha";
import { PrecisaLogin } from "./CarreiraPage";
import { useNavigate } from "react-router";

export function ConquistasPage() {
  const { conta } = useAuth();
  const navigate = useNavigate();
  const conquistas = trpc.perfil.minhasConquistas.useQuery(undefined, { enabled: !!conta });
  const utils = trpc.useUtils();
  const [erro, setErro] = useState("");
  const favoritar = trpc.perfil.favoritarConquista.useMutation({
    onSuccess: () => { setErro(""); utils.perfil.minhasConquistas.invalidate(); },
    onError: (e) => setErro(e.message),
  });

  if (!conta) return <PrecisaLogin navigate={navigate} emoji="🏅" texto="Entre para ver suas conquistas." />;
  if (!conquistas.data) return <div className="mt-16 text-center text-[#b0a6e8]">Carregando conquistas...</div>;

  const desbloqueadas = conquistas.data.filter((c) => c.desbloqueada);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="cartao-rua p-5">
        <div className="flex items-center justify-between">
          <h2 className="texto-pixo text-2xl">CONQUISTAS</h2>
          <span className="rounded-xl border-2 border-[#33286b] bg-black/30 px-3 py-1 text-sm text-[#ffd23f]">
            {desbloqueadas.length} / {conquistas.data.length}
          </span>
        </div>
        <p className="mt-1 text-xs text-[#6f6699]">Toque na ⭐ para destacar até 3 conquistas no seu cartão.</p>
        {erro && <div className="mt-2 rounded-xl border-2 border-[#e03131] bg-[#e03131]/15 px-3 py-2 text-sm text-[#ffb4a8]">{erro}</div>}
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {conquistas.data.map((c) => (
            <div
              key={c.codigo}
              className={`flex items-center gap-3 rounded-xl border-2 p-3 ${
                c.desbloqueada ? "border-[#7048e8] bg-[#7048e8]/10" : "border-[#33286b] bg-black/30 opacity-70"
              }`}
            >
              <span className={`text-3xl ${c.desbloqueada ? "" : "grayscale"}`}>{c.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="leading-tight">{c.nome}</div>
                <div className="text-xs text-[#b0a6e8]">{c.descricao}</div>
                {!c.desbloqueada && (
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/60">
                    <div className="h-full rounded-full bg-[#7048e8]" style={{ width: `${Math.round((c.progresso / c.marco) * 100)}%` }} />
                  </div>
                )}
                {c.desbloqueada && c.desbloqueadaEm && (
                  <div className="mt-0.5 text-[10px] text-[#7be04a]">{new Date(c.desbloqueadaEm).toLocaleDateString("pt-BR")}</div>
                )}
              </div>
              {c.desbloqueada && (
                <button
                  title="Destacar no perfil"
                  className={`flex-none text-xl transition ${c.favorita ? "" : "opacity-30 hover:opacity-80"}`}
                  onClick={() => favoritar.mutate({ codigo: c.codigo, favorita: !c.favorita })}
                >
                  ⭐
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// INVENTÁRIO
// ============================================================================
const ABAS = ["todos", "skin", "banner", "moldura", "titulo", "emblema", "efeito"] as const;

export function InventarioPage() {
  const { conta } = useAuth();
  const navigate = useNavigate();
  const [aba, setAba] = useState<(typeof ABAS)[number]>("todos");
  const inventario = trpc.perfil.meuInventario.useQuery(undefined, { enabled: !!conta });
  const recompensas = trpc.perfil.minhasRecompensas.useQuery(undefined, { enabled: !!conta });
  const utils = trpc.useUtils();
  const [erro, setErro] = useState("");
  const editar = trpc.perfil.editarPerfil.useMutation({
    onSuccess: () => { setErro(""); utils.perfil.invalidate(); utils.auth.invalidate(); },
    onError: (e) => setErro(e.message),
  });

  if (!conta) return <PrecisaLogin navigate={navigate} emoji="🎒" texto="Entre para abrir seu inventário." />;
  if (!inventario.data) return <div className="mt-16 text-center text-[#b0a6e8]">Abrindo a mochila...</div>;

  const itens = inventario.data.filter((i) => aba === "todos" || i.categoria === aba);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="cartao-rua p-5">
        <h2 className="texto-pixo text-2xl">INVENTÁRIO</h2>
        <div className="mt-3 flex gap-1 overflow-x-auto pb-1">
          {ABAS.map((a) => (
            <button
              key={a}
              onClick={() => setAba(a)}
              className={`flex-none rounded-xl px-3 py-1.5 text-sm transition ${aba === a ? "bg-[#ffd23f] text-[#3a2000]" : "bg-black/30 text-[#b0a6e8] hover:text-white"}`}
            >
              {a === "todos" ? "TODOS" : INFO_CATEGORIA[a]?.toUpperCase() ?? a.toUpperCase()}
            </button>
          ))}
        </div>
        {erro && <div className="mt-2 rounded-xl border-2 border-[#e03131] bg-[#e03131]/15 px-3 py-2 text-sm text-[#ffb4a8]">{erro}</div>}

        {itens.length === 0 ? (
          <p className="mt-4 text-sm text-[#b0a6e8]">Nada aqui ainda. Suba de nível, complete conquistas e participe de eventos!</p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {itens.map((i) => (
              <div key={i.codigo} className={`rounded-xl border-2 p-3 text-center ${i.equipado ? "border-[#ffd23f] bg-[#ffd23f]/8" : "border-[#33286b] bg-black/30"}`}>
                <div
                  className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-4xl"
                  style={{ background: `linear-gradient(135deg, ${i.visual.cores[0]}55, ${i.visual.cores[1]}33)` }}
                >
                  {i.visual.emoji}
                </div>
                <div className="mt-2 text-sm leading-tight">{i.nome}</div>
                <div className="mt-1 flex items-center justify-center gap-1">
                  <span className={`tag-raridade raridade-${i.raridade}`}>{INFO_RARIDADE[i.raridade]}</span>
                </div>
                <div className="mt-1 text-[10px] text-[#6f6699]">
                  {i.origemDetalhe ?? i.origem} · {new Date(i.obtidoEm).toLocaleDateString("pt-BR")}
                </div>
                {(i.categoria === "skin" || i.categoria === "banner" || i.categoria === "moldura") && (
                  <button
                    className={`botao-racha mt-2 w-full px-2 py-1 text-xs ${i.equipado ? "botao-fantasma" : "botao-verde"}`}
                    disabled={editar.isPending}
                    onClick={() => {
                      if (i.categoria === "skin") editar.mutate({ skinEquipada: i.codigo });
                      if (i.categoria === "banner") editar.mutate({ bannerEquipado: i.codigo });
                      if (i.categoria === "moldura") editar.mutate({ molduraEquipada: i.equipado ? null : i.codigo });
                    }}
                  >
                    {i.equipado ? (i.categoria === "moldura" ? "REMOVER" : "EQUIPADO ✔") : "EQUIPAR"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* histórico de recompensas */}
      <div className="cartao-rua p-5">
        <h3 className="texto-pixo text-xl">HISTÓRICO DE RECOMPENSAS</h3>
        {!recompensas.data?.length ? (
          <p className="mt-3 text-sm text-[#b0a6e8]">Nenhuma recompensa ainda.</p>
        ) : (
          <div className="mt-3 space-y-1.5">
            {recompensas.data.map((r, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-[#33286b] bg-black/30 px-3 py-2 text-sm">
                <span className="text-xl">{r.emoji}</span>
                <span className="flex-1">{r.nome}</span>
                <span className="text-xs text-[#b0a6e8]">{r.origem}</span>
                <span className="text-[10px] text-[#6f6699]">{new Date(r.quando).toLocaleDateString("pt-BR")}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
