// ============================================================================
// RACHA 2.0 — Carreira (jornada 1→100) e Minha Carreira (estatísticas)
// ============================================================================
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/lib/racha";
import { useNavigate } from "react-router";

export function CarreiraPage() {
  const { conta } = useAuth();
  const navigate = useNavigate();
  const carreira = trpc.perfil.carreira.useQuery(undefined, { enabled: !!conta });

  if (!conta) return <PrecisaLogin navigate={navigate} emoji="📈" texto="Entre para ver sua jornada de carreira." />;
  if (!carreira.data) return <div className="mt-16 text-center text-[#b0a6e8]">Carregando sua jornada...</div>;

  const c = carreira.data;
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* cabeçalho com progresso */}
      <div className="cartao-rua p-5 text-center">
        <div className="text-[10px] tracking-[3px] text-[#b0a6e8]">SUA JORNADA</div>
        <div className="texto-pixo mt-1 text-4xl">NÍVEL {c.nivel}</div>
        <div className="titulo-pixo-roxo text-xl">{c.tituloAtual}</div>
        <div className="mx-auto mt-3 max-w-sm">
          <div className="barra-xp"><div style={{ width: `${Math.round(c.progresso.pct * 100)}%` }} /></div>
          <div className="mt-1 text-xs text-[#b0a6e8]">
            {c.progresso.atual.toLocaleString("pt-BR")} / {c.progresso.necessario.toLocaleString("pt-BR")} XP
            {c.nivel >= 100 && " · NÍVEL MÁXIMO! 👑"}
          </div>
        </div>
        {c.proximaRecompensa?.item && (
          <div className="mx-auto mt-3 flex max-w-xs items-center gap-3 rounded-xl border-2 border-[#7048e8] bg-[#7048e8]/15 px-3 py-2">
            <span className="text-2xl">{c.proximaRecompensa.item.visual.emoji}</span>
            <div className="text-left text-sm">
              <div className="text-[10px] tracking-widest text-[#b0a6e8]">PRÓXIMA RECOMPENSA · NÍVEL {c.proximaRecompensa.nivel}</div>
              <div>{c.proximaRecompensa.item.nome}</div>
            </div>
          </div>
        )}
      </div>

      {/* faixas de título */}
      <div className="cartao-rua p-5">
        <h3 className="texto-pixo text-xl">TÍTULOS DE CARREIRA</h3>
        <div className="mt-3 space-y-1.5">
          {c.faixas.map((f) => (
            <div
              key={f.titulo}
              className={`flex items-center gap-3 rounded-xl border-2 px-3 py-2 ${
                f.atual ? "border-[#ffd23f] bg-[#ffd23f]/10" : f.alcancada ? "border-[#2f9e44] bg-[#2f9e44]/10" : "border-[#33286b] bg-black/30 opacity-60"
              }`}
            >
              <span className="text-lg">{f.alcancada ? "✅" : "🔒"}</span>
              <div className="flex-1">
                <div className="leading-tight">{f.titulo}</div>
                <div className="text-xs text-[#b0a6e8]">Níveis {f.min}–{f.max} · {f.xpNecessario.toLocaleString("pt-BR")} XP</div>
              </div>
              {f.atual && <span className="text-xs text-[#ffd23f]">VOCÊ ESTÁ AQUI</span>}
            </div>
          ))}
        </div>
      </div>

      {/* marcos de recompensa */}
      <div className="cartao-rua p-5">
        <h3 className="texto-pixo text-xl">RECOMPENSAS POR MARCOS</h3>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {c.marcos.map((m) => (
            <div
              key={`${m.nivel}-${m.item.codigo}`}
              className={`rounded-xl border-2 p-3 text-center ${m.alcancado ? "border-[#2f9e44] bg-[#2f9e44]/10" : "border-[#33286b] bg-black/30"}`}
            >
              <div className="text-3xl">{m.item.visual.emoji}</div>
              <div className="mt-1 text-sm leading-tight">{m.item.nome}</div>
              <div className="mt-1 text-[10px] tracking-widest text-[#b0a6e8]">NÍVEL {m.nivel}</div>
            </div>
          ))}
        </div>
      </div>

      {/* histórico de evolução */}
      {c.historico.length > 0 && (
        <div className="cartao-rua p-5">
          <h3 className="texto-pixo text-xl">EVOLUÇÃO RECENTE</h3>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {c.historico.slice(0, 20).map((h, i) => (
              <span key={i} className="rounded-lg border border-[#33286b] bg-black/30 px-2 py-1 text-xs text-[#d8d2f5]">
                Nv. {h.nivel} · {new Date(h.quando).toLocaleDateString("pt-BR")}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MINHA CARREIRA — estatísticas (só o que o servidor pode verificar)
// ============================================================================
export function EstatisticasPage() {
  const { conta } = useAuth();
  const navigate = useNavigate();
  const stats = trpc.perfil.minhasEstatisticas.useQuery(undefined, { enabled: !!conta });
  const partidas = trpc.jogo.minhasPartidas.useQuery(undefined, { enabled: !!conta });

  if (!conta) return <PrecisaLogin navigate={navigate} emoji="📊" texto="Entre para ver suas estatísticas." />;
  if (!stats.data) {
    return (
      <div className="mx-auto mt-16 max-w-sm text-center">
        <div className="text-5xl">📊</div>
        <p className="mt-3 text-[#b0a6e8]">Ainda sem estatísticas. Jogue sua primeira partida valendo!</p>
        <button className="botao-racha botao-amarelo mt-4 px-5 py-2" onClick={() => navigate("/")}>JOGAR AGORA</button>
      </div>
    );
  }
  const s = stats.data;

  const CARTOES = [
    { n: s.partidas, r: "PARTIDAS", e: "🎮" },
    { n: s.vitorias, r: "VITÓRIAS", e: "🏆" },
    { n: s.derrotas, r: "DERROTAS", e: "💔" },
    { n: s.empates, r: "EMPATES", e: "🤝" },
    { n: s.gols, r: "GOLS", e: "⚽" },
    { n: s.assistencias, r: "ASSISTÊNCIAS", e: "👟" },
    { n: s.golsGinga, r: "GOLS DE GINGA", e: "🇧🇷" },
    { n: s.defesas, r: "DEFESAS", e: "🧤" },
    { n: s.dribles, r: "DRIBLES", e: "🌀" },
    { n: s.fintas, r: "FINTAS", e: "✨" },
    { n: s.sequenciaVitorias, r: "SEQUÊNCIA ATUAL", e: "🔥" },
    { n: s.melhorSequencia, r: "MELHOR SEQUÊNCIA", e: "⭐" },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="cartao-rua p-5">
        <h2 className="texto-pixo text-2xl">MINHA CARREIRA</h2>
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
          <Indicador rotulo="APROVEITAMENTO" valor={`${s.aproveitamento}%`} destaque />
          <Indicador rotulo="MÉDIA DE GOLS" valor={String(s.mediaGols)} destaque />
          <Indicador rotulo="TOTAL DE GOLS" valor={String(s.gols + s.golsTreino)} destaque />
          <Indicador rotulo="MODO FAVORITO" valor={s.modoFavorito ? s.modoFavorito.toUpperCase() : "—"} destaque />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {CARTOES.map((c) => (
            <div key={c.r} className="rounded-xl border-2 border-[#33286b] bg-black/30 p-3 text-center">
              <div className="text-2xl">{c.e}</div>
              <div className="texto-pixo mt-1 text-xl leading-none">{c.n}</div>
              <div className="mt-1 text-[9px] tracking-wider text-[#b0a6e8]">{c.r}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-center text-xs text-[#6f6699]">{s.nota}</p>
      </div>

      <div className="cartao-rua p-5">
        <h3 className="texto-pixo text-xl">PARTIDAS RECENTES</h3>
        {!partidas.data?.length ? (
          <p className="mt-3 text-sm text-[#b0a6e8]">Nenhuma partida validada ainda.</p>
        ) : (
          <div className="mt-3 space-y-1.5">
            {partidas.data.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-xl border border-[#33286b] bg-black/30 px-3 py-2 text-sm">
                <span className="text-lg">{p.resultado === "vitoria" ? "🟢" : p.resultado === "derrota" ? "🔴" : "🟡"}</span>
                <span className="font-mono text-base">{p.placarNosso} × {p.placarDeles}</span>
                <span className="text-xs uppercase text-[#b0a6e8]">{p.modo}{p.mapa ? ` · ${p.mapa}` : ""}</span>
                <span className="flex-1" />
                <span className="text-xs text-[#b0a6e8]">⚽{p.gols} 👟{p.assistencias}</span>
                <span className="text-xs text-[#ffd23f]">+{p.xpConcedido} XP</span>
                <span className="text-[10px] text-[#6f6699]">{p.encerradaEm ? new Date(p.encerradaEm).toLocaleDateString("pt-BR") : ""}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Indicador({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div className={`rounded-xl border-2 p-3 text-center ${destaque ? "border-[#7048e8] bg-[#7048e8]/15" : "border-[#33286b] bg-black/30"}`}>
      <div className="texto-pixo text-2xl leading-none">{valor}</div>
      <div className="mt-1 text-[9px] tracking-wider text-[#b0a6e8]">{rotulo}</div>
    </div>
  );
}

export function PrecisaLogin({ navigate, emoji, texto }: { navigate: (p: string) => void; emoji: string; texto: string }) {
  return (
    <div className="mx-auto mt-16 max-w-sm text-center">
      <div className="text-5xl">{emoji}</div>
      <p className="mt-3 text-[#b0a6e8]">{texto}</p>
      <button className="botao-racha botao-amarelo mt-4 px-5 py-2" onClick={() => navigate("/entrar")}>ENTRAR</button>
    </div>
  );
}
