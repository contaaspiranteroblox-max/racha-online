// ============================================================================
// RACHA 2.0 — utilitários compartilhados do frontend
// ============================================================================
import { createContext, useContext, useCallback, useEffect, useState, type ReactNode } from "react";
import { trpc } from "@/providers/trpc";

// ---------- Tipos públicos ----------
export type ContaEu = {
  idPublico: string;
  nomeExibicao: string;
  username: string;
  nivel: number;
  xp: number;
  tituloCarreira: string;
  tituloEquipado: string | null;
  avatarEmoji: string;
  corDestaque: string;
  skinEquipada: string;
  tampa: string | null; // v69: a tampinha personalizada do jogo
  bannerEquipado: string;
  molduraEquipada: string | null;
  selos: string[];
  // v82: a patente da ranqueada guardada na conta
  rq?: { pts: number; melhor: number; jogos: number; vit: number; der: number; emp: number; seq: number; desist: number; importado: boolean } | null;
  criadoEm: Date;
  email: string | null;
  perfilPublico: boolean;
  aceitaPedidos: boolean;
  cargo: string | null;
};

// ---------- Sessão ----------
const AuthCtx = createContext<{
  conta: ContaEu | null;
  carregando: boolean;
  recarregar: () => Promise<unknown>; // (v82: termina quando a conta nova chegou)
  sair: () => void;
}>({ conta: null, carregando: true, recarregar: () => Promise.resolve(), sair: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const eu = trpc.auth.eu.useQuery(undefined, { retry: false, staleTime: 15_000 });
  const utils = trpc.useUtils();
  const sairMut = trpc.auth.sair.useMutation({
    onSettled: () => utils.invalidate(),
  });
  const conta = eu.data?.logado ? (eu.data.conta as ContaEu) : null;
  return (
    <AuthCtx.Provider
      value={{
        conta,
        carregando: eu.isLoading,
        recarregar: () => utils.invalidate(),
        sair: () => sairMut.mutate(),
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}

// ---------- Toasts de celebração (level up, conquista, item novo) ----------
export type Festa =
  | { tipo: "nivel"; nivel: number; titulo: string }
  | { tipo: "conquista"; nome: string; emoji: string }
  | { tipo: "item"; nome: string; emoji: string }
  | { tipo: "xp"; quantidade: number; motivo: string };

const FestaCtx = createContext<{ festejar: (f: Festa[]) => void }>({ festejar: () => {} });

export function useFesta() {
  return useContext(FestaCtx);
}

const CONFETES = ["#ffd23f", "#7048e8", "#7be04a", "#3bc9db", "#f783ac", "#ff922b"];

export function FestaProvider({ children }: { children: ReactNode }) {
  const [festas, setFestas] = useState<(Festa & { id: number })[]>([]);
  const festejar = useCallback((novas: Festa[]) => {
    if (!novas.length) return;
    const comId = novas.map((f, i) => ({ ...f, id: Date.now() + i }));
    setFestas((atual) => [...atual, ...comId]);
    setTimeout(() => setFestas((atual) => atual.filter((f) => !comId.some((n) => n.id === f.id))), 4300);
  }, []);

  return (
    <FestaCtx.Provider value={{ festejar }}>
      {children}
      <div className="pointer-events-none fixed inset-0 z-[100] flex flex-col items-center justify-start gap-3 overflow-hidden pt-24">
        {festas.map((f) => (
          <div key={f.id} className="relative w-full max-w-sm px-4">
            {/* confetes */}
            {f.tipo !== "xp" &&
              Array.from({ length: 26 }).map((_, i) => (
                <span
                  key={i}
                  className="confete"
                  style={{
                    left: `${(i * 37) % 100}%`,
                    background: CONFETES[i % CONFETES.length],
                    animationDuration: `${2.2 + (i % 5) * 0.35}s`,
                    animationDelay: `${(i % 7) * 0.12}s`,
                  }}
                />
              ))}
            <div className="toast-festa cartao-rua pulsa-conquista mx-auto flex items-center gap-4 px-5 py-4 text-center">
              {f.tipo === "nivel" && (
                <>
                  <span className="text-5xl">🆙</span>
                  <div className="text-left">
                    <div className="texto-pixo text-2xl leading-none">SUBIU PARA O NÍVEL {f.nivel}!</div>
                    <div className="titulo-pixo-roxo mt-1 text-lg">{f.titulo}</div>
                  </div>
                </>
              )}
              {f.tipo === "conquista" && (
                <>
                  <span className="text-5xl">{f.emoji}</span>
                  <div className="text-left">
                    <div className="text-sm tracking-widest text-[#b197fc]">CONQUISTA DESBLOQUEADA</div>
                    <div className="texto-pixo text-2xl leading-tight">{f.nome}</div>
                  </div>
                </>
              )}
              {f.tipo === "item" && (
                <>
                  <span className="text-5xl">{f.emoji}</span>
                  <div className="text-left">
                    <div className="text-sm tracking-widest text-[#7be04a]">ITEM NOVO NO INVENTÁRIO</div>
                    <div className="texto-pixo text-2xl leading-tight">{f.nome}</div>
                  </div>
                </>
              )}
              {f.tipo === "xp" && (
                <>
                  <span className="text-4xl">⚡</span>
                  <div className="text-left">
                    <div className="texto-pixo text-xl leading-tight">+{f.quantidade} XP</div>
                    <div className="text-sm text-[#b0a6e8]">{f.motivo}</div>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </FestaCtx.Provider>
  );
}

// ---------- Visuais de itens ----------
export const INFO_RARIDADE: Record<string, string> = {
  comum: "COMUM",
  raro: "RARO",
  epico: "ÉPICO",
  lendario: "LENDÁRIO",
  exclusivo: "EXCLUSIVO",
};

export const INFO_CATEGORIA: Record<string, string> = {
  skin: "Skin",
  banner: "Banner",
  moldura: "Moldura",
  titulo: "Título",
  emblema: "Emblema",
  efeito: "Efeito",
};

export const NOME_SELOS: Record<string, { nome: string; cor: string; emoji: string }> = {
  verificado: { nome: "Verificado RACHA", cor: "#2f9e44", emoji: "✔" },
  criador: { nome: "Criador do RACHA", cor: "#f59a0c", emoji: "★" },
  parceiro: { nome: "Parceiro RACHA", cor: "#0b7285", emoji: "🤝" },
  equipe: { nome: "Equipe RACHA", cor: "#5f3dc4", emoji: "🛡" },
};

// v79: O SELO V (o mesmo desenho do jogo: tools/v79/selo.js) — um emblema de seis lados com o V no meio, na cor de cada selo:
// dourado (VERIFICADO: os influenciadores), prata (PARCEIRO), vermelho (EQUIPE) e laranja (CRIADOR). Só o admin dá (RACHA CONTROL).
export const CORES_SELO_V: Record<string, [string, string, string]> = {
  verificado: ["#fff3b0", "#ffc928", "#a86a00"],
  parceiro: ["#ffffff", "#c3ccd8", "#5d6b82"],
  equipe: ["#ffc2b8", "#ff3b30", "#8c1010"],
  criador: ["#ffe0bd", "#ff8a2a", "#9a4300"],
};
export const ORDEM_SELOS = ["equipe", "criador", "verificado", "parceiro"];
let seloVSeq = 0;
export function SeloV({ selo, tamanho = 18, titulo }: { selo: string; tamanho?: number; titulo?: string }) {
  const c = CORES_SELO_V[selo];
  const [id] = useState(() => "selov" + ++seloVSeq);
  if (!c) return null;
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" role="img" aria-label={titulo ?? NOME_SELOS[selo]?.nome ?? selo} className="inline-block align-middle shrink-0">
      <title>{titulo ?? NOME_SELOS[selo]?.nome ?? selo}</title>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2=".35" y2="1">
          <stop offset="0" stopColor={c[0]} />
          <stop offset=".5" stopColor={c[1]} />
          <stop offset="1" stopColor={c[2]} />
        </linearGradient>
      </defs>
      <path d="M12 .8l10.2 5.9v11.8L12 24.4 1.8 18.5V6.7z" fill="#111" />
      <path d="M12 2.3l8.9 5.1v10.3L12 22.9l-8.9-5.2V7.4z" fill={`url(#${id})`} />
      <path d="M12 5.1l6.5 3.8v7.6L12 20.2l-6.5-3.7V8.9z" fill="#15110a" opacity=".82" />
      <path d="M7.1 7.9h3.3l1.6 5.3 1.6-5.3h3.3l-3.4 9.3h-3z" fill={`url(#${id})`} stroke="#111" strokeWidth=".9" strokeLinejoin="round" />
    </svg>
  );
}
export function SelosLinha({ selos, grande }: { selos: string[]; grande?: boolean }) {
  if (!selos?.length) return null;
  const lista = ORDEM_SELOS.filter((s) => selos.includes(s));
  return (
    <span className="inline-flex items-center gap-1 align-middle">
      {lista.map((s) => (
        <SeloV key={s} selo={s} tamanho={grande ? 24 : 18} />
      ))}
    </span>
  );
}

// Converte eventos de progressão da API em festas
export function festasDeResultado(
  r: {
    subiuNivel?: boolean;
    nivel?: number;
    titulo?: string;
    itensNovos?: string[];
    conquistasNovas?: string[];
    xpConcedido?: number;
  },
  nomeItem: (codigo: string) => { nome: string; emoji: string },
  nomeConquista: (codigo: string) => { nome: string; emoji: string },
): Festa[] {
  const festas: Festa[] = [];
  if (r.xpConcedido && r.xpConcedido > 0) {
    festas.push({ tipo: "xp", quantidade: r.xpConcedido, motivo: "Partida válida contabilizada" });
  }
  if (r.subiuNivel && r.nivel) {
    festas.push({ tipo: "nivel", nivel: r.nivel, titulo: r.titulo ?? "" });
  }
  for (const c of r.conquistasNovas ?? []) {
    const info = nomeConquista(c);
    festas.push({ tipo: "conquista", nome: info.nome, emoji: info.emoji });
  }
  for (const i of r.itensNovos ?? []) {
    const info = nomeItem(i);
    festas.push({ tipo: "item", nome: info.nome, emoji: info.emoji });
  }
  return festas;
}

export function useRelogio() {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);
}
