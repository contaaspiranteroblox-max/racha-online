// ============================================================================
// RACHA 2.0 — Amigos: busca, pedidos, bloqueados · Ranking
// ============================================================================
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth, SelosLinha } from "@/lib/racha";
import { PrecisaLogin } from "./CarreiraPage";
import { AvatarComMoldura } from "@/components/racha/Cartao";
import { PatenteChip } from "@/components/racha/Patente"; // v82

type JogadorResumo = {
  idPublico: string; nomeExibicao: string; username: string; nivel: number;
  tituloCarreira: string; avatarEmoji: string; molduraEquipada: string | null; selos: string[];
};

function LinhaJogador({ j, extra }: { j: JogadorResumo; extra?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#33286b] bg-black/30 px-3 py-2">
      <Link to={`/jogador/${j.idPublico}`} className="flex min-w-0 flex-1 items-center gap-3">
        <AvatarComMoldura emoji={j.avatarEmoji} moldura={j.molduraEquipada} tamanho={40} />
        <div className="min-w-0">
          <div className="flex items-center gap-1 truncate">
            <SelosLinha selos={j.selos} />
            <span className="truncate">{j.nomeExibicao}</span>
          </div>
          <div className="text-xs text-[#b0a6e8]">ID {j.idPublico} · Nv. {j.nivel} · {j.tituloCarreira}</div>
        </div>
      </Link>
      {extra}
    </div>
  );
}

export function AmigosPage() {
  const { conta } = useAuth();
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [msg, setMsg] = useState("");
  const utils = trpc.useUtils();

  const amigos = trpc.amigos.listar.useQuery(undefined, { enabled: !!conta });
  const pedidos = trpc.amigos.pedidos.useQuery(undefined, { enabled: !!conta });
  const bloqueados = trpc.amigos.bloqueados.useQuery(undefined, { enabled: !!conta });
  const resultado = trpc.perfil.buscarJogadores.useQuery({ termo: busca }, { enabled: !!conta && busca.trim().length >= 2, retry: false });

  const invalida = () => { utils.amigos.invalidate(); };
  const enviar = trpc.amigos.enviarPedido.useMutation({ onSuccess: (r) => { setMsg(r.viraram ? "Vocês viraram amigos! 🤝" : "Pedido enviado!"); invalida(); }, onError: (e) => setMsg(e.message) });
  const responder = trpc.amigos.responderPedido.useMutation({ onSuccess: invalida, onError: (e) => setMsg(e.message) });
  const remover = trpc.amigos.remover.useMutation({ onSuccess: invalida });
  const bloquear = trpc.amigos.bloquear.useMutation({ onSuccess: invalida });
  const desbloquear = trpc.amigos.desbloquear.useMutation({ onSuccess: invalida });

  if (!conta) return <PrecisaLogin navigate={navigate} emoji="🤝" texto="Entre para adicionar os parceiros de racha." />;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* busca */}
      <div className="cartao-rua p-5">
        <h2 className="texto-pixo text-2xl">BUSCAR JOGADORES</h2>
        <div className="mt-3 flex gap-2">
          <input className="input-racha" placeholder="ID (000123) ou nome de usuário" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        {msg && <div className="mt-2 rounded-xl border-2 border-[#7048e8] bg-[#7048e8]/15 px-3 py-2 text-sm text-[#d0bfff]">{msg}</div>}
        {busca.trim().length >= 2 && (
          <div className="mt-3 space-y-1.5">
            {resultado.isLoading && <div className="text-sm text-[#b0a6e8]">Procurando...</div>}
            {resultado.error && <div className="text-sm text-[#ffb4a8]">{resultado.error.message}</div>}
            {resultado.data?.length === 0 && <div className="text-sm text-[#b0a6e8]">Ninguém encontrado com esse termo.</div>}
            {resultado.data?.map((j) => (
              <LinhaJogador
                key={j.idPublico}
                j={j as JogadorResumo}
                extra={
                  <div className="flex flex-none gap-1.5">
                    <button className="botao-racha botao-verde px-2.5 py-1 text-xs" onClick={() => enviar.mutate({ termo: j.idPublico })}>+ AMIGO</button>
                    <button className="botao-racha botao-fantasma px-2.5 py-1 text-xs" title="Bloquear" onClick={() => bloquear.mutate({ termo: j.idPublico })}>🚫</button>
                  </div>
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* pedidos recebidos */}
      {(pedidos.data?.recebidos?.length ?? 0) > 0 && (
        <div className="cartao-rua p-5">
          <h3 className="texto-pixo text-xl">PEDIDOS RECEBIDOS ({pedidos.data!.recebidos.length})</h3>
          <div className="mt-3 space-y-1.5">
            {pedidos.data!.recebidos.map((p) => p && (
              <LinhaJogador
                key={p.pedidoId}
                j={p.jogador as JogadorResumo}
                extra={
                  <div className="flex flex-none gap-1.5">
                    <button className="botao-racha botao-verde px-2.5 py-1 text-xs" onClick={() => responder.mutate({ pedidoId: p.pedidoId, aceitar: true })}>ACEITAR</button>
                    <button className="botao-racha botao-fantasma px-2.5 py-1 text-xs" onClick={() => responder.mutate({ pedidoId: p.pedidoId, aceitar: false })}>RECUSAR</button>
                  </div>
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* amigos */}
      <div className="cartao-rua p-5">
        <h3 className="texto-pixo text-xl">MEUS AMIGOS ({amigos.data?.length ?? 0})</h3>
        <div className="mt-3 space-y-1.5">
          {!amigos.data?.length && <p className="text-sm text-[#b0a6e8]">Ainda sem amigos. Busque pelo ID e chame a rapaziada!</p>}
          {amigos.data?.map((j) => j && (
            <LinhaJogador
              key={j.idPublico}
              j={j as JogadorResumo}
              extra={
                <button className="botao-racha botao-fantasma flex-none px-2.5 py-1 text-xs" onClick={() => remover.mutate({ termo: j.idPublico })}>REMOVER</button>
              }
            />
          ))}
        </div>
      </div>

      {/* bloqueados */}
      {(bloqueados.data?.length ?? 0) > 0 && (
        <div className="cartao-rua p-5">
          <h3 className="texto-pixo text-xl">BLOQUEADOS</h3>
          <div className="mt-3 space-y-1.5">
            {bloqueados.data!.map((j) => j && (
              <LinhaJogador
                key={j.idPublico}
                j={j as JogadorResumo}
                extra={
                  <button className="botao-racha botao-fantasma flex-none px-2.5 py-1 text-xs" onClick={() => desbloquear.mutate({ termo: j.idPublico })}>DESBLOQUEAR</button>
                }
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// RANKING
// ============================================================================
export function RankingPage() {
  const [tipo, setTipo] = useState<"patente" | "nivel" | "gols" | "vitorias">("patente"); // v82: as patentes primeiro
  const ranking = trpc.perfil.ranking.useQuery({ tipo: tipo === "patente" ? "nivel" : tipo }, { enabled: tipo !== "patente" });
  const patentes = trpc.perfil.rankingPatentes.useQuery({ limite: 100 }, { enabled: tipo === "patente" });

  return (
    <div className="mx-auto max-w-2xl">
      <div className="cartao-rua p-5">
        <h2 className="texto-pixo text-2xl">RANKING DA QUEBRADA 🏆</h2>
        <div className="mt-3 flex gap-1">
          {([["patente", "PATENTES"], ["nivel", "NÍVEL"], ["gols", "GOLS"], ["vitorias", "VITÓRIAS"]] as const).map(([t, r]) => (
            <button
              key={t}
              onClick={() => setTipo(t)}
              className={`flex-1 rounded-xl px-3 py-1.5 text-sm transition ${tipo === t ? "bg-[#ffd23f] text-[#3a2000]" : "bg-black/30 text-[#b0a6e8]"}`}
            >
              {r}
            </button>
          ))}
        </div>
        {tipo === "patente" && (
          <div className="mt-4 space-y-1.5">
            {!patentes.data && <div className="text-sm text-[#b0a6e8]">Carregando...</div>}
            {patentes.data && patentes.data.lista.length === 0 && (
              <div className="text-sm text-[#b0a6e8]">Ninguém jogou a ranqueada com a conta ainda. Jogue uma e apareça aqui!</div>
            )}
            {patentes.data?.lista.map((j) => (
              <Link
                key={j.idPublico}
                to={`/jogador/${j.idPublico}`}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2 transition hover:border-[#7048e8] ${
                  patentes.data?.eu?.idPublico === j.idPublico ? "border-[#7be04a] bg-[#7be04a]/10" : j.posicao <= 3 ? "border-[#ffd23f] bg-[#ffd23f]/8" : "border-[#33286b] bg-black/30"
                }`}
              >
                <span className={`texto-pixo w-8 text-center text-xl ${j.posicao === 1 ? "text-[#ffd23f]" : j.posicao === 2 ? "text-[#dee2e6]" : j.posicao === 3 ? "text-[#e8965a]" : "text-[#6f6699]"}`}>
                  {j.posicao}
                </span>
                <AvatarComMoldura emoji={j.avatarEmoji} moldura={j.molduraEquipada} tamanho={38} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 truncate">
                    <SelosLinha selos={j.selos} />
                    <span className="truncate">{j.nomeExibicao}</span>
                  </div>
                  <div className="mt-0.5">
                    <PatenteChip id={j.patente.id} titulo={j.patente.titulo} />
                  </div>
                </div>
                <div className="texto-pixo flex-none text-lg text-[#ffd23f]">{j.pts.toLocaleString("pt-BR")}</div>
              </Link>
            ))}
            {patentes.data?.eu && (
              <div className="mt-2 rounded-xl border border-[#7be04a] bg-black/30 px-3 py-2 text-sm">
                Você: <PatenteChip id={patentes.data.eu.patente.id} titulo={patentes.data.eu.patente.titulo} pts={patentes.data.eu.pts} />
                {patentes.data.eu.posicao ? ` · ${patentes.data.eu.posicao}º lugar` : " · jogue a ranqueada para entrar no ranking"}
              </div>
            )}
          </div>
        )}
        {tipo !== "patente" && (
        <div className="mt-4 space-y-1.5">
          {!ranking.data && <div className="text-sm text-[#b0a6e8]">Carregando...</div>}
          {ranking.data?.map((j) => (
            <Link
              key={j.idPublico}
              to={`/jogador/${j.idPublico}`}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2 transition hover:border-[#7048e8] ${
                j.posicao <= 3 ? "border-[#ffd23f] bg-[#ffd23f]/8" : "border-[#33286b] bg-black/30"
              }`}
            >
              <span className={`texto-pixo w-8 text-center text-xl ${j.posicao === 1 ? "text-[#ffd23f]" : j.posicao === 2 ? "text-[#dee2e6]" : j.posicao === 3 ? "text-[#e8965a]" : "text-[#6f6699]"}`}>
                {j.posicao}
              </span>
              <AvatarComMoldura emoji={j.avatarEmoji} moldura={j.molduraEquipada} tamanho={38} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 truncate">
                  <SelosLinha selos={j.selos} />
                  <span className="truncate">{j.nomeExibicao}</span>
                </div>
                <div className="text-xs text-[#b0a6e8]">{j.titulo}</div>
              </div>
              <div className="texto-pixo flex-none text-lg text-[#ffd23f]">
                {tipo === "nivel" ? `Nv. ${j.nivel}` : tipo === "gols" ? `${j.gols} ⚽` : `${j.vitorias} 🏆`}
              </div>
            </Link>
          ))}
        </div>
        )}
        <p className="mt-3 text-center text-xs text-[#6f6699]">
          Só entram contas ativas com perfil público. Valores validados pelo servidor.
          {tipo === "patente" && " A ranqueada online é conferida pelo servidor das salas; contra os bots, os pontos ganhos por dia têm teto."}
        </p>
      </div>
    </div>
  );
}
