// ============================================================================
// RACHA v82 — O selo da patente da ranqueada (a mesma tabela do jogo: contracts/patentes.ts)
// ============================================================================
import { PATENTES } from "@contracts/patentes";

export function corDaPatente(id: string): string {
  return PATENTES.find((p) => p.id === id)?.cor ?? "#c87a4a";
}

export function PatenteChip({ id, titulo, pts, grande }: { id: string; titulo: string; pts?: number | null; grande?: boolean }) {
  const cor = corDaPatente(id);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border-2 ${grande ? "px-3 py-1" : "px-2 py-0.5"}`}
      style={{ borderColor: cor, background: cor + "22" }}
      title={pts != null ? `${titulo} · ${pts.toLocaleString("pt-BR")} pontos` : titulo}
    >
      <svg viewBox="0 0 24 24" className={grande ? "h-5 w-5" : "h-4 w-4"} aria-hidden="true">
        <path d="M12 2l8 3v6c0 5-3.4 8.6-8 11-4.6-2.4-8-6-8-11V5z" fill={cor} stroke="#000" strokeOpacity=".55" strokeWidth="1.5" />
        <circle cx="12" cy="11" r="3.2" fill="#fff" fillOpacity=".9" />
      </svg>
      <span className={`texto-pixo leading-none ${grande ? "text-base" : "text-sm"}`} style={{ color: cor }}>
        {titulo}
      </span>
      {pts != null && <span className="text-xs text-[#b0a6e8]">{pts.toLocaleString("pt-BR")} pts</span>}
    </span>
  );
}
