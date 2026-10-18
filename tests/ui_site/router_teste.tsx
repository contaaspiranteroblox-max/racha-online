// RACHA · v88.1 — o "react-router" dos testes de navegador do SITE (tests/ui_site): o que as páginas testadas usam, em cima
// do #endereço (o npm não instala o react-router nesta máquina). Só para os testes.
import { useEffect, type ReactNode } from "react";
const parte = () => { const h = window.location.hash.replace(/^#/, "") || "/"; const i = h.indexOf("?"); return { caminho: i < 0 ? h : h.slice(0, i), busca: i < 0 ? "" : h.slice(i) }; };
export function useNavigate() { return (to: string) => { window.location.hash = "#" + to; }; }
export function useSearchParams() { return [new URLSearchParams(parte().busca), () => {}] as const; }
export function useLocation() { const p = parte(); return { pathname: p.caminho, search: p.busca, hash: "" }; }
export function Link({ to, children, ...r }: { to: string; children?: ReactNode; [k: string]: unknown }) { return <a href={"#" + to} {...(r as object)}>{children}</a>; }
export const NavLink = Link;
export function Navigate({ to }: { to: string }) { useEffect(() => { window.location.hash = "#" + to; }, [to]); return null; }
