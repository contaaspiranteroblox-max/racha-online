// ============================================================================
// RACHA 2.0 — Meu Perfil (cartão + edição) e Perfil público de outro jogador
// ============================================================================
import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/lib/racha";
import Cartao from "@/components/racha/Cartao";

const CORES = ["#ffd23f", "#7be04a", "#3bc9db", "#f783ac", "#ff922b", "#b197fc", "#ff6b6b", "#ffffff"];

export function PerfilPage() {
  const { conta, recarregar } = useAuth();
  const navigate = useNavigate();
  const cartao = trpc.perfil.meuCartao.useQuery(undefined, { enabled: !!conta });
  const avatares = trpc.perfil.avataresDisponiveis.useQuery();
  const inventario = trpc.perfil.meuInventario.useQuery(undefined, { enabled: !!conta });
  const [editando, setEditando] = useState(false);
  const [erro, setErro] = useState("");
  const editar = trpc.perfil.editarPerfil.useMutation({
    onSuccess: () => { setErro(""); recarregar(); cartao.refetch(); },
    onError: (e) => setErro(e.message),
  });

  if (!conta) {
    return (
      <div className="mx-auto mt-16 max-w-sm text-center">
        <div className="text-5xl">🪪</div>
        <p className="mt-3 text-[#b0a6e8]">Entre na sua conta para ver seu Cartão do RACHA.</p>
        <button className="botao-racha botao-amarelo mt-4 px-5 py-2" onClick={() => navigate("/entrar")}>ENTRAR</button>
      </div>
    );
  }
  if (!cartao.data) return <div className="mt-16 text-center text-[#b0a6e8]">Carregando seu cartão...</div>;

  const d = cartao.data;
  const skins = (inventario.data ?? []).filter((i) => i.categoria === "skin");
  const banners = (inventario.data ?? []).filter((i) => i.categoria === "banner");
  const molduras = (inventario.data ?? []).filter((i) => i.categoria === "moldura");

  return (
    <div className="flex flex-col items-center gap-4">
      <Cartao
        d={{ ...d, privado: false }}
        acoes={
          <>
            <button className="botao-racha botao-roxo flex-1 px-3 py-2 text-sm" onClick={() => setEditando(!editando)}>
              {editando ? "FECHAR EDIÇÃO" : "✏️ EDITAR PERFIL"}
            </button>
            <button
              className="botao-racha botao-fantasma flex-1 px-3 py-2 text-sm"
              onClick={() => {
                const url = `${location.origin}/jogador/${d.idPublico}`;
                navigator.clipboard?.writeText(url).catch(() => {});
                alert("Link do seu perfil copiado!\n" + url);
              }}
            >
              🔗 COMPARTILHAR
            </button>
          </>
        }
      />

      {editando && (
        <div className="cartao-rua w-full max-w-md p-5">
          <h3 className="texto-pixo text-xl">EDITAR PERFIL</h3>
          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-xs tracking-widest text-[#b0a6e8]">NOME DE EXIBIÇÃO</label>
              <div className="flex gap-2">
                <input id="ed-nome" className="input-racha" defaultValue={d.nomeExibicao} maxLength={32} />
                <button
                  className="botao-racha botao-verde flex-none px-3 text-sm"
                  onClick={() => editar.mutate({ nomeExibicao: (document.getElementById("ed-nome") as HTMLInputElement).value.trim() })}
                >
                  OK
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs tracking-widest text-[#b0a6e8]">AVATAR</label>
              <div className="grid grid-cols-8 gap-1.5">
                {(avatares.data ?? []).map((a) => (
                  <button
                    key={a}
                    onClick={() => editar.mutate({ avatarEmoji: a })}
                    className={`rounded-xl border-2 p-1 text-2xl transition ${d.avatarEmoji === a ? "border-[#ffd23f] bg-[#ffd23f]/15" : "border-[#33286b] bg-black/30 hover:border-[#7048e8]"}`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs tracking-widest text-[#b0a6e8]">COR DE DESTAQUE</label>
              <div className="flex gap-2">
                {CORES.map((c) => (
                  <button
                    key={c}
                    onClick={() => editar.mutate({ corDestaque: c })}
                    className={`h-8 w-8 rounded-full border-2 transition ${d.corDestaque === c ? "scale-110 border-white" : "border-black/40"}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>

            <Seletor titulo="BANNER" itens={banners} equipado={d.bannerEquipado} aoEscolher={(c) => editar.mutate({ bannerEquipado: c })} />
            <Seletor titulo="MOLDURA" itens={molduras} equipado={d.molduraEquipada} aoEscolher={(c) => editar.mutate({ molduraEquipada: c })} aoRemover={() => editar.mutate({ molduraEquipada: null })} />
            <Seletor titulo="SKIN PRINCIPAL" itens={skins} equipado={d.skinEquipada} aoEscolher={(c) => editar.mutate({ skinEquipada: c })} />

            <div className="flex items-center justify-between rounded-xl border-2 border-[#33286b] bg-black/30 px-3 py-2">
              <span className="text-sm">Perfil público</span>
              <button
                className={`botao-racha px-3 py-1 text-xs ${d.progresso && conta.perfilPublico ? "botao-verde" : "botao-fantasma"}`}
                onClick={() => editar.mutate({ perfilPublico: !conta.perfilPublico })}
              >
                {conta.perfilPublico ? "PÚBLICO" : "PRIVADO"}
              </button>
            </div>
            <div className="flex items-center justify-between rounded-xl border-2 border-[#33286b] bg-black/30 px-3 py-2">
              <span className="text-sm">Aceitar pedidos de amizade</span>
              <button
                className={`botao-racha px-3 py-1 text-xs ${conta.aceitaPedidos ? "botao-verde" : "botao-fantasma"}`}
                onClick={() => editar.mutate({ aceitaPedidos: !conta.aceitaPedidos })}
              >
                {conta.aceitaPedidos ? "ACEITANDO" : "FECHADO"}
              </button>
            </div>

            {erro && <div className="rounded-xl border-2 border-[#e03131] bg-[#e03131]/15 px-3 py-2 text-sm text-[#ffb4a8]">{erro}</div>}
          </div>
          <p className="mt-4 text-center text-xs text-[#6f6699]">
            <Link to="/conquistas" className="text-[#b197fc] underline">Destaque até 3 conquistas</Link> na aba Conquistas · Troque senha e gerencie sessões abaixo.
          </p>
          <SegurancaConta />
        </div>
      )}
    </div>
  );
}

function Seletor({ titulo, itens, equipado, aoEscolher, aoRemover }: {
  titulo: string;
  itens: { codigo: string; nome: string; visual: { emoji: string; cores: [string, string] } }[];
  equipado: string | null;
  aoEscolher: (c: string) => void;
  aoRemover?: () => void;
}) {
  if (itens.length === 0) return null;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="block text-xs tracking-widest text-[#b0a6e8]">{titulo}</label>
        {aoRemover && equipado && (
          <button className="text-xs text-[#f783ac] underline" onClick={aoRemover}>remover</button>
        )}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {itens.map((i) => (
          <button
            key={i.codigo}
            onClick={() => aoEscolher(i.codigo)}
            title={i.nome}
            className={`flex h-14 w-14 flex-none items-center justify-center rounded-xl border-2 text-2xl transition ${
              equipado === i.codigo ? "border-[#ffd23f] bg-[#ffd23f]/15" : "border-[#33286b] bg-black/30 hover:border-[#7048e8]"
            }`}
            style={{ background: `linear-gradient(135deg, ${i.visual.cores[0]}33, ${i.visual.cores[1]}22)` }}
          >
            {i.visual.emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

function SegurancaConta() {
  const [aberto, setAberto] = useState(false);
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [msg, setMsg] = useState("");
  const sessoes = trpc.auth.minhasSessoes.useQuery(undefined, { enabled: aberto });
  const utils = trpc.useUtils();
  const trocar = trpc.auth.trocarSenha.useMutation({
    onSuccess: (r) => { setMsg(r.aviso); setTimeout(() => location.reload(), 1800); },
    onError: (e) => setMsg(e.message),
  });
  const revogar = trpc.auth.revogarSessao.useMutation({ onSuccess: () => utils.auth.minhasSessoes.invalidate() });

  return (
    <div className="mt-4 border-t-2 border-[#33286b] pt-3">
      <button className="w-full text-left text-sm text-[#b0a6e8]" onClick={() => setAberto(!aberto)}>
        🔐 Segurança da conta {aberto ? "▲" : "▼"}
      </button>
      {aberto && (
        <div className="mt-3 space-y-3">
          <div className="space-y-2">
            <input className="input-racha" type="password" placeholder="Senha atual" value={atual} onChange={(e) => setAtual(e.target.value)} />
            <input className="input-racha" type="password" placeholder="Nova senha (8+ caracteres)" value={nova} onChange={(e) => setNova(e.target.value)} />
            <button className="botao-racha botao-roxo w-full px-3 py-2 text-sm" disabled={trocar.isPending} onClick={() => trocar.mutate({ senhaAtual: atual, novaSenha: nova })}>
              TROCAR SENHA (desconecta todos os aparelhos)
            </button>
            {msg && <div className="text-center text-sm text-[#ffd23f]">{msg}</div>}
          </div>
          <div>
            <div className="mb-1 text-xs tracking-widest text-[#b0a6e8]">SESSÕES ATIVAS</div>
            <div className="space-y-1.5">
              {(sessoes.data ?? []).map((s) => (
                <div key={s.id} className="flex items-center gap-2 rounded-xl border border-[#33286b] bg-black/30 px-3 py-2 text-xs">
                  <span className="flex-1 truncate">{s.atual ? "📱 Esta sessão" : s.painelAdmin ? "🛡 Painel" : "📱 Sessão"} · {s.ip ?? "?"}</span>
                  {!s.atual && (
                    <button className="text-[#f783ac] underline" onClick={() => revogar.mutate({ sessaoId: s.id })}>revogar</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Perfil público de outro jogador (/jogador/:termo)
// ============================================================================
export function JogadorPage() {
  const { termo = "" } = useParams();
  const { conta } = useAuth();
  const navigate = useNavigate();
  const perfil = trpc.perfil.perfilPublico.useQuery({ termo }, { retry: false });
  const [denunciaAberta, setDenunciaAberta] = useState(false);
  const [motivo, setMotivo] = useState<"nome_ofensivo" | "trapaça" | "assedio" | "conteudo_improprio" | "outro">("outro");
  const [detalhes, setDetalhes] = useState("");
  const [msg, setMsg] = useState("");

  const amizade = trpc.amigos.enviarPedido.useMutation({
    onSuccess: (r) => setMsg(r.viraram ? "Vocês viraram amigos! 🤝" : "Pedido de amizade enviado!"),
    onError: (e) => setMsg(e.message),
  });
  const denunciar = trpc.amigos.denunciar.useMutation({
    onSuccess: (r) => { setMsg(r.aviso); setDenunciaAberta(false); },
    onError: (e) => setMsg(e.message),
  });

  if (perfil.isLoading) return <div className="mt-16 text-center text-[#b0a6e8]">Procurando o jogador...</div>;
  if (perfil.error || !perfil.data) {
    return (
      <div className="mx-auto mt-16 max-w-sm text-center">
        <div className="text-5xl">🔍</div>
        <p className="mt-3 text-[#b0a6e8]">Jogador não encontrado. Confere o ID ou o nome.</p>
        <button className="botao-racha botao-fantasma mt-4 px-4 py-2" onClick={() => navigate("/amigos")}>BUSCAR DE NOVO</button>
      </div>
    );
  }

  const d = perfil.data;
  return (
    <div className="flex flex-col items-center gap-3">
      <Cartao
        d={{ ...d, privado: d.privado }}
        acoes={
          conta ? (
            <>
              <button className="botao-racha botao-verde flex-1 px-3 py-2 text-sm" disabled={amizade.isPending} onClick={() => { setMsg(""); amizade.mutate({ termo: d.idPublico }); }}>
                🤝 ADICIONAR AMIGO
              </button>
              <button
                className="botao-racha botao-fantasma flex-1 px-3 py-2 text-sm"
                onClick={() => {
                  const url = `${location.origin}/jogador/${d.idPublico}`;
                  navigator.clipboard?.writeText(url).catch(() => {});
                  alert("Link copiado!\n" + url);
                }}
              >
                🔗 COMPARTILHAR
              </button>
              <button className="botao-racha botao-fantasma flex-1 px-3 py-2 text-sm text-[#f783ac]" onClick={() => setDenunciaAberta(!denunciaAberta)}>
                🚩 DENUNCIAR
              </button>
            </>
          ) : undefined
        }
      />
      {msg && <div className="cartao-rua w-full max-w-md px-4 py-2 text-center text-sm text-[#ffd23f]">{msg}</div>}

      {denunciaAberta && (
        <div className="cartao-rua w-full max-w-md p-4">
          <h3 className="texto-pixo text-lg">DENUNCIAR PERFIL</h3>
          <div className="mt-3 space-y-2">
            <select className="input-racha" value={motivo} onChange={(e) => setMotivo(e.target.value as typeof motivo)}>
              <option value="nome_ofensivo">Nome ofensivo</option>
              <option value="trapaça">Trapaça</option>
              <option value="assedio">Assédio</option>
              <option value="conteudo_improprio">Conteúdo impróprio</option>
              <option value="outro">Outro</option>
            </select>
            <textarea className="input-racha min-h-20" placeholder="Detalhes (opcional)" value={detalhes} onChange={(e) => setDetalhes(e.target.value)} maxLength={500} />
            <button
              className="botao-racha botao-amarelo w-full px-3 py-2"
              disabled={denunciar.isPending}
              onClick={() => denunciar.mutate({ termo: d.idPublico, motivo, detalhes: detalhes || undefined })}
            >
              ENVIAR DENÚNCIA
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
