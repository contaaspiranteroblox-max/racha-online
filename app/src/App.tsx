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

export default function App() {
  return (
    <AuthProvider>
      <FestaProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<ExigeConta><LobbyPage /></ExigeConta>} />
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
            <Route path="*" element={<ExigeConta><LobbyPage /></ExigeConta>} />
          </Routes>
        </Layout>
      </FestaProvider>
    </AuthProvider>
  );
}
