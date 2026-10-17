// ============================================================================
// RACHA 2.0 — Layout: barra superior com o chip do jogador + navegação
// ============================================================================
import { Link, NavLink, useNavigate } from "react-router";
import { useAuth, SelosLinha } from "@/lib/racha";
import { AvatarComMoldura } from "./Cartao";
import { progressoNivel } from "@contracts/racha";

const NAV = [
  { para: "/", rotulo: "⚽ Jogar", fim: true },
  { para: "/perfil", rotulo: "🪪 Perfil" },
  { para: "/carreira", rotulo: "📈 Carreira" },
  { para: "/estatisticas", rotulo: "📊 Estatísticas" },
  { para: "/conquistas", rotulo: "🏅 Conquistas" },
  { para: "/inventario", rotulo: "🎒 Inventário" },
  { para: "/amigos", rotulo: "🤝 Amigos" },
  { para: "/ranking", rotulo: "🏆 Ranking" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { conta, carregando, sair } = useAuth();
  const navigate = useNavigate();
  const prog = conta ? progressoNivel(conta.xp) : null;

  return (
    <div className="fundo-quadra flex min-h-full flex-col">
      <header className="sticky top-0 z-40 border-b-2 border-[#241b56] bg-[#0d0b1e]/92 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-2">
          <Link to="/" className="texto-pixo flex-none text-2xl tracking-wide">RACHA</Link>

          {conta ? (
            <Link to="/perfil" className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border-2 border-[#33286b] bg-black/30 px-2 py-1 transition hover:border-[#7048e8] sm:max-w-xs">
              <AvatarComMoldura emoji={conta.avatarEmoji} moldura={conta.molduraEquipada} tamanho={34} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 truncate text-sm leading-tight">
                  <SelosLinha selos={conta.selos} />
                  <span className="truncate">{conta.nomeExibicao}</span>
                </div>
                {prog && (
                  <div className="mt-0.5 h-2 overflow-hidden rounded-full bg-black/60">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#7048e8] to-[#ffd23f]" style={{ width: `${Math.round(prog.pct * 100)}%` }} />
                  </div>
                )}
              </div>
              <span className="texto-pixo flex-none rounded-lg bg-[#241b56] px-1.5 py-0.5 text-sm">{conta.nivel}</span>
            </Link>
          ) : (
            <div className="flex-1">
              {!carregando && (
                <button className="botao-racha botao-amarelo px-4 py-1.5 text-sm" onClick={() => navigate("/entrar")}>
                  ENTRAR NA QUADRA
                </button>
              )}
            </div>
          )}

          {conta?.cargo && (
            <Link to="/admin" className="botao-racha botao-roxo flex-none px-3 py-1.5 text-xs sm:text-sm">
              🛡 RACHA CONTROL
            </Link>
          )}
          {conta && (
            <button
              onClick={() => { sair(); navigate("/"); }}
              className="botao-racha botao-fantasma flex-none px-3 py-1.5 text-xs sm:text-sm"
              title="Sair da conta"
            >
              SAIR
            </button>
          )}
        </div>

        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 pb-1.5">
          {NAV.map((n) => (
            <NavLink
              key={n.para}
              to={n.para}
              end={n.fim}
              className={({ isActive }) =>
                `flex-none rounded-xl px-3 py-1.5 text-sm transition ${
                  isActive ? "bg-[#ffd23f] text-[#3a2000] shadow-[0_3px_0_#14161a]" : "text-[#b0a6e8] hover:bg-white/5 hover:text-white"
                }`
              }
            >
              {n.rotulo}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-3 py-4">{children}</main>

      <footer className="border-t-2 border-[#241b56] py-3 text-center text-xs text-[#6f6699]">
        RACHA · futebol de rua de tampinhas · progressão validada no servidor
      </footer>
    </div>
  );
}
