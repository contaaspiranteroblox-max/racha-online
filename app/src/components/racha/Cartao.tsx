// ============================================================================
// RACHA 2.0 — CARTÃO DO RACHA: o perfil como cartão de carreira do futebol de rua
// ============================================================================
import { CATALOGO_ITENS } from "@contracts/racha";
import { SelosLinha } from "@/lib/racha";
import { PatenteChip } from "@/components/racha/Patente";

export type DadosCartao = {
  idPublico: string;
  nomeExibicao: string;
  nivel: number;
  xp?: number;
  tituloCarreira: string;
  tituloEquipado: string | null;
  avatarEmoji: string;
  corDestaque: string;
  skinEquipada: string;
  bannerEquipado: string;
  molduraEquipada: string | null;
  selos: string[];
  criadoEm: Date | string;
  progresso?: { nivel: number; atual: number; necessario: number; pct: number } | null;
  conquistasFavoritas?: { codigo: string; nome: string; emoji: string }[];
  totalConquistas?: number;
  stats?: {
    partidas: number; vitorias: number; gols: number; assistencias: number;
    aproveitamento: number; mediaGols: number; melhorSequencia: number;
  } | null;
  privado?: boolean;
  // v82: a patente da ranqueada guardada na conta
  patente?: { id: string; titulo: string; pts: number; jogos: number; vit: number } | null;
};

function itemVisual(codigo: string | null | undefined) {
  if (!codigo) return null;
  return CATALOGO_ITENS.find((i) => i.codigo === codigo) ?? null;
}

export function BannerFundo({ codigo, children }: { codigo: string; children?: React.ReactNode }) {
  const banner = itemVisual(codigo);
  const [c1, c2] = banner?.visual.cores ?? ["#1a2744", "#3b5bdb"];
  return (
    <div
      className="relative overflow-hidden rounded-t-[18px]"
      style={{
        background: `linear-gradient(120deg, ${c1}, ${c2})`,
        minHeight: 110,
      }}
    >
      {/* textura de grafite: riscos e respingos */}
      <div
        className="absolute inset-0 opacity-25"
        style={{
          background:
            "repeating-linear-gradient(-55deg, transparent 0 14px, rgba(0,0,0,.28) 14px 16px), radial-gradient(circle at 78% 20%, rgba(255,255,255,.35), transparent 30%), radial-gradient(circle at 12% 85%, rgba(0,0,0,.35), transparent 40%)",
        }}
      />
      <div className="absolute right-3 top-2 text-4xl opacity-70 drop-shadow-lg">{banner?.visual.emoji ?? "🌃"}</div>
      <div className="absolute bottom-1 right-3 text-[10px] font-bold uppercase tracking-[3px] text-white/60">
        {banner?.nome ?? "RACHA"}
      </div>
      {children}
    </div>
  );
}

export function AvatarComMoldura({
  emoji, moldura, tamanho = 92, brilho,
}: { emoji: string; moldura: string | null; tamanho?: number; brilho?: boolean }) {
  const classe = moldura ? `moldura moldura-${moldura.replace("moldura_", "").replace(/_/g, "-")}` : "";
  return (
    <div className={brilho ? "brilho-idolo rounded-full" : "rounded-full"}>
      <div className={moldura ? classe : ""} style={moldura ? undefined : { padding: 4 }}>
        <div
          className="flex items-center justify-center rounded-full border-4 border-[#14102a] bg-gradient-to-br from-[#241b56] to-[#120e2c] shadow-xl"
          style={{ width: tamanho, height: tamanho, fontSize: tamanho * 0.52 }}
        >
          {emoji}
        </div>
      </div>
    </div>
  );
}

export default function Cartao({ d, acoes }: { d: DadosCartao; acoes?: React.ReactNode }) {
  const skin = itemVisual(d.skinEquipada);
  const temEfeitoIdolo = false; // efeito cosmético aplicado via inventário (brilho dourado)
  const entrada = new Date(d.criadoEm);
  return (
    <div className="cartao-rua w-full max-w-md overflow-hidden" style={{ boxShadow: `0 12px 40px rgba(0,0,0,.5), 0 0 0 2px ${d.corDestaque}22` }}>
      <BannerFundo codigo={d.bannerEquipado} />
      <div className="relative px-5 pb-5">
        {/* avatar + nível */}
        <div className="-mt-12 flex items-end justify-between">
          <AvatarComMoldura emoji={d.avatarEmoji} moldura={d.molduraEquipada} brilho={temEfeitoIdolo} />
          <div className="mb-1 rounded-xl border-2 border-[#33286b] bg-black/50 px-3 py-1 text-center">
            <div className="texto-pixo text-2xl leading-none">{d.nivel}</div>
            <div className="text-[10px] tracking-[2px] text-[#b0a6e8]">NÍVEL</div>
          </div>
        </div>

        {/* nome + selos + id */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <SelosLinha selos={d.selos} grande />
          <h2 className="text-2xl leading-none" style={{ color: d.corDestaque, textShadow: "2px 2px 0 rgba(0,0,0,.6)" }}>
            {d.nomeExibicao}
          </h2>
        </div>
        <div className="mt-1 flex items-center gap-2 text-sm text-[#b0a6e8]">
          <span className="rounded-md bg-black/40 px-2 py-0.5 font-mono tracking-widest text-[#ffd23f]">ID {d.idPublico}</span>
          <span>·</span>
          <span>entrou em {entrada.toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}</span>
        </div>

        {/* título de carreira */}
        <div className="mt-3 inline-flex items-center gap-2 rounded-xl border-2 border-[#7048e8] bg-[#7048e8]/15 px-3 py-1.5">
          <span className="text-lg">⚡</span>
          <span className="titulo-pixo-roxo text-lg leading-none">{d.tituloEquipado || d.tituloCarreira}</span>
        </div>

        {/* v82: a patente da ranqueada */}
        {d.patente && (d.patente.pts > 0 || d.patente.jogos > 0) && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[10px] tracking-[2px] text-[#b0a6e8]">RANQUEADA</span>
            <PatenteChip id={d.patente.id} titulo={d.patente.titulo} pts={d.patente.pts} grande />
            {d.patente.jogos > 0 && <span className="text-xs text-[#b0a6e8]">{d.patente.vit}/{d.patente.jogos} vitórias</span>}
          </div>
        )}

        {/* XP */}
        {d.progresso && (
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-[#b0a6e8]">
              <span>{d.progresso.atual.toLocaleString("pt-BR")} XP</span>
              {d.nivel < 100 && <span>faltam {(d.progresso.necessario - d.progresso.atual).toLocaleString("pt-BR")} XP</span>}
            </div>
            <div className="barra-xp">
              <div style={{ width: `${Math.round(d.progresso.pct * 100)}%` }} />
            </div>
          </div>
        )}

        {/* skin em destaque */}
        {skin && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border-2 border-[#33286b] bg-black/30 p-3">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full text-3xl shadow-lg"
              style={{ background: `radial-gradient(circle at 35% 30%, ${skin.visual.cores[1]}, ${skin.visual.cores[0]})` }}
            >
              {skin.visual.emoji}
            </div>
            <div>
              <div className="text-[10px] tracking-[2px] text-[#b0a6e8]">TAMPINHA PRINCIPAL</div>
              <div className="text-lg leading-tight">{skin.nome}</div>
            </div>
          </div>
        )}

        {/* conquistas favoritas */}
        {d.conquistasFavoritas && d.conquistasFavoritas.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 text-[10px] tracking-[2px] text-[#b0a6e8]">CONQUISTAS EM DESTAQUE</div>
            <div className="flex gap-2">
              {d.conquistasFavoritas.map((c) => (
                <div key={c.codigo} className="flex flex-1 flex-col items-center gap-1 rounded-xl border-2 border-[#33286b] bg-black/30 p-2 text-center">
                  <span className="text-2xl">{c.emoji}</span>
                  <span className="text-[10px] leading-tight text-[#d8d2f5]">{c.nome}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* estatísticas rápidas */}
        {d.stats && (
          <div className="mt-4 grid grid-cols-4 gap-2 text-center">
            {[
              { n: d.stats.partidas, r: "PARTIDAS" },
              { n: `${d.stats.aproveitamento}%`, r: "APROVEIT." },
              { n: d.stats.gols, r: "GOLS" },
              { n: d.stats.melhorSequencia, r: "MELHOR SEQ." },
            ].map((s) => (
              <div key={s.r} className="rounded-xl border-2 border-[#33286b] bg-black/30 px-1 py-2">
                <div className="texto-pixo text-xl leading-none">{s.n}</div>
                <div className="mt-1 text-[9px] tracking-wider text-[#b0a6e8]">{s.r}</div>
              </div>
            ))}
          </div>
        )}

        {d.privado && (
          <div className="mt-4 rounded-xl border-2 border-[#33286b] bg-black/30 p-3 text-center text-sm text-[#b0a6e8]">
            🔒 Esse jogador deixou o perfil privado. Só o cartão aparece.
          </div>
        )}

        {acoes && <div className="mt-4 flex flex-wrap gap-2">{acoes}</div>}
      </div>
    </div>
  );
}
