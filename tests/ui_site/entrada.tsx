// RACHA · v88.1 — a página de teste do SITE (tests/build/ui_site.html): as páginas de verdade do app/src (o login, a
// redefinição de senha e o RACHA CONTROL) com o cliente de teste (trpc_teste.tsx), pelo #endereço:
//   #/admin → RACHA CONTROL · #/entrar → o login do site · #/redefinir?token=… → a senha nova pelo link do e-mail
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider } from "@/lib/racha";
import AdminPage from "@/pages/AdminPage";
import EntrarPage from "@/pages/EntrarPage";
import RedefinirPage from "@/pages/RedefinirPage";

function Pagina() {
  const [h, setH] = useState(window.location.hash);
  useEffect(() => { const f = () => setH(window.location.hash); window.addEventListener("hashchange", f); return () => window.removeEventListener("hashchange", f); }, []);
  const caminho = (h.replace(/^#/, "") || "/").split("?")[0];
  if (caminho === "/admin") return <AdminPage />;
  if (caminho === "/entrar") return <EntrarPage key={h} />;
  if (caminho === "/redefinir") return <RedefinirPage />;
  return <div data-testid="inicio">início ({caminho})</div>;
}
createRoot(document.getElementById("raiz")!).render(<AuthProvider><Pagina /></AuthProvider>);
