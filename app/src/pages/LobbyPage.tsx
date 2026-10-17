// ============================================================================
// RACHA 2.0 — Lobby: o jogo em tela cheia + ponte de progressão
// v84: sem modo convidado — o App só renderiza esta página com conta válida.
// ============================================================================
import { usePonteJogo } from "@/lib/ponteJogo";
import { useAuth } from "@/lib/racha";

export default function LobbyPage() {
  const { conta } = useAuth();
  const { prontoParaJogo } = usePonteJogo();

  // v82: o jogo abre quando já se sabe quem está logado (cada conta tem o seu progresso no aparelho: o jogo separa antes
  // de carregar) e abre de novo quando a conta muda (entrou, saiu, trocou) — a key do iframe é a conta.
  // v84: convidado não joga — a rota já exige conta, então o iframe só existe com usuário autenticado.
  return (
    <div className="relative -mx-3 -my-4" style={{ height: "calc(100vh - 118px)", minHeight: 480 }}>
      {prontoParaJogo && conta ? (
        <iframe
          key={"c" + conta.idPublico}
          src="/game/racha.html"
          title="RACHA — jogo"
          className="h-full w-full border-0"
          allow="autoplay; fullscreen; gamepad"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-sm text-[#b0a6e8]">Carregando a quadra…</div>
      )}
    </div>
  );
}
