// ============================================================================
// RACHA 2.0 — Hook da ponte jogo ↔ plataforma (lado React)
// Recebe os eventos do iframe, abre partida no servidor (token) e envia o
// resultado ao final. XP e estatísticas são calculados SÓ no servidor.
// ============================================================================
import { useEffect, useRef } from "react";
import { trpc } from "@/providers/trpc";
import { useAuth, useFesta, festasDeResultado } from "@/lib/racha";
import { CATALOGO_ITENS, CATALOGO_CONQUISTAS } from "@contracts/racha";

type PartidaAberta = {
  matchId: string;
  token: string;
};

const nomeItem = (codigo: string) => {
  const i = CATALOGO_ITENS.find((x) => x.codigo === codigo);
  const c = CATALOGO_CONQUISTAS.find((x) => `emb_${x.codigo}` === codigo);
  return { nome: i?.nome ?? c?.nome ?? codigo, emoji: i?.visual.emoji ?? c?.emoji ?? "🎁" };
};
const nomeConquista = (codigo: string) => {
  const c = CATALOGO_CONQUISTAS.find((x) => x.codigo === codigo);
  return { nome: c?.nome ?? codigo, emoji: c?.emoji ?? "🏅" };
};

export function usePonteJogo() {
  const { conta, recarregar } = useAuth();
  const { festejar } = useFesta();
  const utils = trpc.useUtils();
  const aberta = useRef<PartidaAberta | null>(null);

  const iniciar = trpc.jogo.iniciarPartida.useMutation();
  const encerrar = trpc.jogo.encerrarPartida.useMutation();
  const golTreino = trpc.jogo.golTreino.useMutation();

  const iniciarRef = useRef(iniciar);
  const encerrarRef = useRef(encerrar);
  const treinoRef = useRef(golTreino);
  iniciarRef.current = iniciar;
  encerrarRef.current = encerrar;
  treinoRef.current = golTreino;

  const contaRef = useRef(conta);
  contaRef.current = conta;

  useEffect(() => {
    function aoMensagem(ev: MessageEvent) {
      if (ev.origin !== window.location.origin) return;
      const d = ev.data as { racha?: string } & Record<string, unknown>;
      if (!d || typeof d.racha !== "string") return;

      // Sem login, o jogo roda solto (convidado) — sem progressão no servidor
      if (!contaRef.current) return;

      if (d.racha === "partida_inicio") {
        const matchId = crypto.randomUUID();
        iniciarRef.current.mutate(
          {
            matchId,
            modo: String(d.modo ?? "futebol"),
            mapa: d.mapa ? String(d.mapa) : undefined,
            nivelBots: ["facil", "medio", "dificil", "lenda"].includes(String(d.nivelBots))
              ? (String(d.nivelBots) as "facil" | "medio" | "dificil" | "lenda")
              : undefined,
          },
          {
            onSuccess: (r) => {
              aberta.current = { matchId, token: r.matchToken };
            },
          },
        );
      }

      if (d.racha === "partida_fim") {
        const ab = aberta.current;
        if (!ab) return; // partida começou sem token (ex.: login caiu) — ignora com honestidade
        aberta.current = null;
        encerrarRef.current.mutate(
          {
            matchId: ab.matchId,
            matchToken: ab.token,
            placarNosso: Number(d.placarNosso) || 0,
            placarDeles: Number(d.placarDeles) || 0,
            gols: Number(d.gols) || 0,
            assistencias: Number(d.assistencias) || 0,
            golsGinga: Number(d.golsGinga) || 0,
            duracaoSeg: Number(d.duracaoSeg) || 0,
            abandonada: !!d.abandonada,
          },
          {
            onSuccess: (r) => {
              if (r.duplicada || r.xpConcedido === 0 && !r.subiuNivel) return;
              festejar(festasDeResultado(r, nomeItem, nomeConquista));
              recarregar();
              utils.perfil.invalidate();
              utils.jogo.minhasPartidas.invalidate();
            },
          },
        );
      }

      if (d.racha === "gol_treino") {
        treinoRef.current.mutate(
          { quantidade: 1, origem: d.origem === "treino" ? "treino" : "livre" },
          {
            onSuccess: (r) => {
              if (r.xpConcedido > 0 || r.subiuNivel) {
                festejar(
                  festasDeResultado(
                    { xpConcedido: r.xpConcedido, subiuNivel: r.subiuNivel, nivel: r.nivel, itensNovos: r.itensNovos, conquistasNovas: r.conquistasNovas },
                    nomeItem,
                    nomeConquista,
                  ),
                );
                recarregar();
              }
            },
          },
        );
      }
    }

    window.addEventListener("message", aoMensagem);
    return () => window.removeEventListener("message", aoMensagem);
  }, [festejar, recarregar, utils]);

  return { ponteAtiva: !!conta };
}
