// ============================================================================
// RACHA 2.0 — Hook da ponte jogo ↔ plataforma (lado React)
// Recebe os eventos do iframe, abre partida no servidor (token) e envia o
// resultado ao final. XP e estatísticas são calculados SÓ no servidor.
// ============================================================================
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth, useFesta, festasDeResultado, type ContaEu } from "@/lib/racha";
import { CATALOGO_ITENS, CATALOGO_CONQUISTAS, progressoNivel } from "@contracts/racha";

// Páginas da plataforma que o lobby do jogo pode abrir (o botão AMIGOS do lobby abre /amigos)
const ROTAS_DO_JOGO = new Set(["/amigos", "/ranking", "/perfil", "/conquistas", "/inventario", "/carreira", "/estatisticas"]);
const ROTA_JOGADOR = /^\/jogador\/\d{1,9}$/;   // v81: o perfil público de outro jogador (o chat abre pelo nome: /jogador/000123)
const ROTA_ENTRAR = /^\/entrar(\?aba=(entrar|criar))?$/;   // v82: ENTRAR e CRIAR CONTA de dentro do jogo

// v70: de onde a ponte aceita mensagens — o próprio site (o jogo em /game/racha.html) e, se o jogo for publicado em
// outro endereço, os de VITE_RACHA_ORIGENS_JOGO (separados por vírgula). E só de um iframe desta página.
const ORIGENS_JOGO = new Set<string>([
  window.location.origin,
  ...String(import.meta.env.VITE_RACHA_ORIGENS_JOGO ?? "").split(",").map((s: string) => s.trim()).filter(Boolean),
]);
function veioDoJogo(ev: MessageEvent): boolean {
  if (!ORIGENS_JOGO.has(ev.origin)) return false;
  for (let i = 0; i < window.frames.length; i++) if (window.frames[i] === ev.source) return true;
  return false;
}
type JanelaComPonte = Window & { RACHA_ABRIR?: (rota: string) => boolean; RACHA_JOGO?: PonteJogoApi };

// v69: o que o jogo pede à plataforma (a conta, as skins da conta, a tampinha e os CLUBES). Tudo passa pelo
// cliente tRPC daqui (com o login do site); o jogo nunca vê o token. Sem login, conta() devolve null e o jogo
// usa o clube "neste aparelho".
type FormClube = { nome: string; descricao: string; pais: string; tipo: "publico" | "convite"; trofeuMinimo: number; escudo?: string };
// v82: a conta que o jogo vê — o nível e o XP da conta (a curva da conta, contracts/racha.ts) e a patente guardada na conta
type ContaJogo = {
  idPublico: string;
  nome: string;
  tampa: string | null;
  selos: string[];
  nivel: number;
  xp: number;
  nivelInfo: { n: number; atual: number; prox: number };
  rq: { pts: number; melhor: number; jogos: number; vit: number; der: number; emp: number; seq: number; desist: number; importado: boolean } | null;
};
type CopiaNuvem = { versao: number; dados: unknown; bytes: number; aparelho: string | null; salvoEm: number };
// o que a plataforma conta ao jogo: a conta mudou (nível, XP, patente) · o que o servidor fez com a partida · a ranqueada
// de antes que ficou aberta e venceu contou como desistência (n partidas; rq: a patente depois)
type EventoConta =
  | { tipo: "conta"; conta: ContaJogo | null }
  | { tipo: "resultado"; resultado: unknown; erro?: string }
  | { tipo: "desistencia"; n: number; rq: unknown };
type PonteJogoApi = {
  versao: number; // v82
  conta: () => ContaJogo | null; // v79: + os selos (o V na frente do nome) · v82: + nível, XP e patente da conta
  inventario: () => Promise<string[]>;
  tampa: (codigo: string) => Promise<unknown>;
  bilheteSala: () => Promise<string | null>; // v70: o bilhete da conta para o servidor da turma (salas online)
  clubes: {
    listar: (busca: string) => Promise<unknown>;
    meu: () => Promise<unknown>;
    ver: (id: string) => Promise<unknown>;
    criar: (f: FormClube) => Promise<unknown>;
    editar: (id: string, f: Partial<FormClube>) => Promise<unknown>;
    entrar: (id: string) => Promise<unknown>;
    sair: () => Promise<unknown>;
    convidar: (termo: string) => Promise<unknown>;
    convites: () => Promise<unknown>;
    responder: (id: string, aceitar: boolean) => Promise<unknown>;
    expulsar: (idPublico: string) => Promise<unknown>;
    passarDono: (idPublico: string) => Promise<unknown>;
  };
  // v82: o progresso do jogo na conta, as patentes e o aviso do que mudou
  progresso: {
    inicial: () => CopiaNuvem | null | undefined; // a cópia da conta carregada antes do jogo abrir (undefined: ainda não chegou)
    carregar: () => Promise<CopiaNuvem | null>;
    salvar: (versaoBase: number, dados: unknown, aparelho?: string) => Promise<unknown>;
  };
  patente: {
    minha: () => Promise<unknown>;
    ranking: (limite?: number) => Promise<unknown>;
    importar: (pts: number) => Promise<unknown>;
  };
  ouvir: (fn: (ev: EventoConta) => void) => () => void;
};

function contaJogo(c: ContaEu | null): ContaJogo | null {
  if (!c) return null;
  const pr = progressoNivel(Number(c.xp) || 0);
  return {
    idPublico: c.idPublico,
    nome: c.nomeExibicao,
    tampa: c.tampa ?? null,
    selos: Array.isArray(c.selos) ? c.selos.slice() : [],
    nivel: c.nivel,
    xp: Number(c.xp) || 0,
    nivelInfo: { n: pr.nivel, atual: pr.atual, prox: pr.necessario },
    rq: c.rq ? { ...c.rq } : null,
  };
}

// v82: o token chega depois (a partida começa na hora; o fim que chegar antes da resposta espera por ela, em vez de se perder)
type PartidaAberta = {
  matchId: string;
  token: Promise<string | null>;
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
  const { conta, carregando, recarregar } = useAuth();
  const { festejar } = useFesta();
  const utils = trpc.useUtils();
  const aberta = useRef<PartidaAberta | null>(null);

  // v82: a cópia do progresso da conta vem antes do jogo abrir (o jogo começa com ela, sem precisar recarregar)
  const nuvem = trpc.progresso.carregar.useQuery(undefined, { enabled: !!conta, staleTime: Infinity, refetchOnWindowFocus: false, retry: 1 });
  const nuvemRef = useRef<CopiaNuvem | null | undefined>(undefined);
  // (a busca falhou: "não sei" — undefined —, não "a conta não tem cópia": o jogo pede de novo e não pergunta nada à toa)
  nuvemRef.current = !conta ? null : nuvem.isSuccess ? (nuvem.data as CopiaNuvem | null) : undefined;
  const [esperouDemais, setEsperouDemais] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setEsperouDemais(true), 3000);
    return () => clearTimeout(t);
  }, [conta?.idPublico]);
  const ouvintes = useRef(new Set<(ev: EventoConta) => void>());
  const avisa = (ev: EventoConta) => {
    for (const fn of [...ouvintes.current]) {
      try {
        fn(ev);
      } catch {
        ouvintes.current.delete(fn); // (o jogo que registrou já fechou)
      }
    }
  };
  const avisaRef = useRef(avisa);
  avisaRef.current = avisa;
  useEffect(() => {
    avisaRef.current({ tipo: "conta", conta: contaJogo(conta) });
  }, [conta]);

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

  // O jogo roda num iframe da mesma origem: o lobby dele chama window.parent.RACHA_ABRIR("/amigos")
  // para abrir uma página de verdade da plataforma. Fora da plataforma a função não existe e o jogo
  // mostra o aviso dele.
  const navigate = useNavigate();
  useEffect(() => {
    const w = window as JanelaComPonte;
    const cli = utils.client;
    w.RACHA_JOGO = {
      versao: 82,
      conta: () => contaJogo(contaRef.current),
      inventario: () => cli.perfil.meuInventario.query().then((l) => l.filter((i) => i.categoria === "skin").map((i) => i.codigo)),
      tampa: (codigo) => cli.clubes.salvarTampa.mutate({ codigo }),
      bilheteSala: () => cli.jogo.bilheteSala.mutate().then((r: { bilhete: string | null }) => r.bilhete),
      clubes: {
        listar: (busca) => cli.clubes.listar.query({ busca }),
        meu: () => cli.clubes.meu.query(),
        ver: (id) => cli.clubes.ver.query({ id }),
        criar: (f) => cli.clubes.criar.mutate(f),
        editar: (id, f) => cli.clubes.editar.mutate({ id, ...f }),
        entrar: (id) => cli.clubes.entrar.mutate({ id }),
        sair: () => cli.clubes.sair.mutate(),
        convidar: (termo) => cli.clubes.convidar.mutate({ termo }),
        convites: () => cli.clubes.convites.query(),
        responder: (id, aceitar) => cli.clubes.responder.mutate({ id, aceitar }),
        expulsar: (idPublico) => cli.clubes.expulsar.mutate({ id: idPublico }),
        passarDono: (idPublico) => cli.clubes.passarDono.mutate({ id: idPublico }),
      },
      progresso: {
        inicial: () => nuvemRef.current,
        carregar: () => cli.progresso.carregar.query().then((r) => r as CopiaNuvem | null),
        salvar: (versaoBase, dados, aparelho) =>
          cli.progresso.salvar.mutate({ versaoBase, dados, aparelho }).then((r) => {
            // (a cópia guardada aqui acompanha: se o jogo abrir de novo nesta página, ele parte da versão certa)
            if (r.ok) utils.progresso.carregar.setData(undefined, { versao: r.versao, dados, bytes: 0, aparelho: aparelho ?? null, salvoEm: Date.now() } as never);
            else if (r.conflito) utils.progresso.carregar.setData(undefined, r as never);
            return r;
          }),
      },
      patente: {
        minha: () => cli.perfil.minhaPatente.query(),
        ranking: (limite) => cli.perfil.rankingPatentes.query({ limite: limite ?? 100 }),
        // (a resposta espera a conta nova chegar: o jogo abre de novo logo depois e já vê a patente que veio)
        importar: (pts) => cli.perfil.importarPatente.mutate({ pts }).then((r) => recarregar().then(() => r, () => r)),
      },
      ouvir: (fn) => {
        ouvintes.current.add(fn);
        return () => {
          ouvintes.current.delete(fn);
        };
      },
    };
    return () => {
      delete w.RACHA_JOGO;
    };
  }, [utils]);
  useEffect(() => {
    const w = window as JanelaComPonte;
    w.RACHA_ABRIR = (rota: string) => {
      if (!ROTAS_DO_JOGO.has(rota) && !ROTA_JOGADOR.test(rota) && !ROTA_ENTRAR.test(rota)) return false;
      navigate(rota);
      return true;
    };
    return () => {
      delete w.RACHA_ABRIR;
    };
  }, [navigate]);

  useEffect(() => {
    function aoMensagem(ev: MessageEvent) {
      if (!veioDoJogo(ev)) return; // v70: só o jogo (a origem permitida, num iframe desta página)
      const d = ev.data as { racha?: string } & Record<string, unknown>;
      if (!d || typeof d.racha !== "string") return;

      // Sem login, o jogo roda solto (convidado) — sem progressão no servidor
      if (!contaRef.current) return;

      if (d.racha === "partida_inicio") {
        const matchId = crypto.randomUUID();
        const token = iniciarRef.current
          .mutateAsync({
            matchId,
            modo: String(d.modo ?? "futebol"),
            mapa: d.mapa ? String(d.mapa) : undefined,
            nivelBots: ["facil", "medio", "dificil", "lenda"].includes(String(d.nivelBots))
              ? (String(d.nivelBots) as "facil" | "medio" | "dificil" | "lenda")
              : undefined,
            // v82: a ranqueada (a patente da conta) e o tamanho do time
            ranqueada: !!d.ranqueada,
            online: !!d.online,
            tamanho: [1, 2, 3, 4].includes(Number(d.tamanho)) ? Number(d.tamanho) : undefined,
          })
          .then((r) => {
            // v82: a ranqueada de antes que ficou aberta e venceu contou como desistência: o jogo fica sabendo já
            if (r.desistencias) {
              avisaRef.current({ tipo: "desistencia", n: r.desistencias, rq: r.rq });
              recarregar();
            }
            return r.matchToken;
          })
          .catch(() => null);
        aberta.current = { matchId, token };
      }

      if (d.racha === "partida_fim") {
        const ab = aberta.current;
        if (!ab) return; // fim sem começo (o jogo abriu no meio de uma partida) — ignora com honestidade
        aberta.current = null;
        void ab.token.then((matchToken) => {
          if (!matchToken) {
            // a partida não abriu no servidor (login caiu, sem rede): o jogo volta para a patente da conta
            avisaRef.current({ tipo: "resultado", resultado: null, erro: "A partida não foi aberta na conta (sem conexão no começo)." });
            return;
          }
          encerrarRef.current.mutate(
            {
              matchId: ab.matchId,
              matchToken,
              placarNosso: Number(d.placarNosso) || 0,
              placarDeles: Number(d.placarDeles) || 0,
              gols: Number(d.gols) || 0,
              assistencias: Number(d.assistencias) || 0,
              golsGinga: Number(d.golsGinga) || 0,
              duracaoSeg: Number(d.duracaoSeg) || 0,
              abandonada: !!d.abandonada,
              // v70: o modo, os pontos (cestas, gol de ginga), os gols contra e a partida online com o selo do servidor da turma
              modo: typeof d.modo === "string" ? d.modo : undefined,
              pontos: Number(d.pontos) || 0,
              golsContra: Number(d.golsContra) || 0,
              online: !!d.online,
              valida: d.valida !== false,
              selo: typeof d.selo === "string" && d.selo ? d.selo : undefined,
            },
            {
              onSuccess: (r) => {
                avisaRef.current({ tipo: "resultado", resultado: r }); // v82: o jogo acerta a patente e mostra o XP da conta
                if (r.rq) recarregar(); // (a patente mudou: a conta que o jogo vê também)
                if (r.duplicada || r.xpConcedido === 0 && !r.subiuNivel) return;
                festejar(festasDeResultado(r, nomeItem, nomeConquista));
                recarregar();
                utils.perfil.invalidate();
                utils.jogo.minhasPartidas.invalidate();
              },
              onError: (e) => {
                avisaRef.current({ tipo: "resultado", resultado: null, erro: e.message }); // v82: o jogo volta para a patente da conta
                recarregar();
              },
            },
          );
        });
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

  // v82: o jogo só abre depois de saber quem está logado (e, logado, com a cópia do progresso — ou 3 s de espera)
  const prontoParaJogo = !carregando && (!conta || nuvem.isFetched || esperouDemais);
  return { ponteAtiva: !!conta, prontoParaJogo };
}
