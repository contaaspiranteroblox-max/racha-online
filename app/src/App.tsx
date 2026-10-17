import { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router";
import { AuthProvider, FestaProvider, useAuth } from "@/lib/racha";
import Layout from "@/components/racha/Layout";
import LobbyPage from "@/pages/LobbyPage";
import EntrarPage from "@/pages/EntrarPage";
import RedefinirPage from "@/pages/RedefinirPage";
import { PerfilPage, JogadorPage } from "@/pages/PerfilPage";
import { CarreiraPage, EstatisticasPage } from "@/pages/CarreiraPage";
import { ConquistasPage, InventarioPage } from "@/pages/ConquistasPage";
import { AmigosPage, RankingPage } from "@/pages/AmigosPage";
import AdminPage from "@/pages/AdminPage";

// v84 — login obrigatório: nenhuma área do jogo abre sem sessão válida.
// A verificação acontece na entrada (AuthProvider valida/renova a sessão no
// servidor); enquanto isso a tela mostra um estado de "verificando".
function ExigeConta({ children }: { children: React.ReactNode }) {
  const { conta, carregando } = useAuth();
  const local = useLocation();
  if (carregando) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-400">
        Verificando sua sessão…
      </div>
    );
  }
  if (!conta) {
    const destino = encodeURIComponent(local.pathname + local.search);
    return <Navigate to={`/entrar?destino=${destino}`} replace />;
  }
  return <>{children}</>;
}

// v87 — o site abre o JOGO direto, em tela cheia (/game/racha.html): o login é o do jogo e as coisas da conta ficam nos
// botões do jogo (as páginas da conta abrem por cima dele, num painel). A raiz e os endereços desconhecidos levam ao jogo.
// Dentro do painel do jogo (esta página num iframe por cima do jogo), "ir para o jogo" é fechar o painel.
function IrParaOJogo() {
  const noPainel = window.self !== window.top;
  const semJogo = window.location.pathname.startsWith("/game/"); // (o arquivo do jogo não veio no build: sem laço de volta)
  useEffect(() => {
    if (noPainel) {
      try {
        window.parent.postMessage({ racha: "site_fechar" }, window.location.origin);
      } catch {
        // (o painel fecha pelo VOLTAR AO JOGO)
      }
      return;
    }
    if (!semJogo) window.location.replace("/game/racha.html" + window.location.search + window.location.hash);
  }, [noPainel, semJogo]);
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4 text-center text-sm text-zinc-400">
      {semJogo
        ? "O jogo não está em /game/racha.html neste servidor (confira o build da plataforma)."
        : noPainel
          ? "Voltando ao jogo…"
          : "Abrindo o jogo…"}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <FestaProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<IrParaOJogo />} />
            {/* v87: o jogo dentro do site (o jeito de antes, com a barra e as abas) continua neste endereço */}
            <Route path="/jogo-no-site" element={<ExigeConta><LobbyPage /></ExigeConta>} />
            <Route path="/entrar" element={<EntrarPage />} />
            <Route path="/redefinir" element={<RedefinirPage />} />
            <Route path="/perfil" element={<ExigeConta><PerfilPage /></ExigeConta>} />
            <Route path="/jogador/:termo" element={<ExigeConta><JogadorPage /></ExigeConta>} />
            <Route path="/carreira" element={<ExigeConta><CarreiraPage /></ExigeConta>} />
            <Route path="/estatisticas" element={<ExigeConta><EstatisticasPage /></ExigeConta>} />
            <Route path="/conquistas" element={<ExigeConta><ConquistasPage /></ExigeConta>} />
            <Route path="/inventario" element={<ExigeConta><InventarioPage /></ExigeConta>} />
            <Route path="/amigos" element={<ExigeConta><AmigosPage /></ExigeConta>} />
            <Route path="/ranking" element={<ExigeConta><RankingPage /></ExigeConta>} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="*" element={<IrParaOJogo />} />
          </Routes>
        </Layout>
      </FestaProvider>
    </AuthProvider>
  );
}
