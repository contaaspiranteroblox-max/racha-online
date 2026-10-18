// ============================================================================
// RACHA 2.0 — RACHA CONTROL: painel administrativo
// Aparência profissional (fundo escuro, roxo/amarelo), login próprio + 2FA,
// cargos, permissões, gestão por ID, distribuição, denúncias e auditoria.
// ============================================================================
import { useMemo, useState } from "react";
import { trpc } from "@/providers/trpc";
import { CATALOGO_ITENS, SELO_INFO, type Selo } from "@contracts/racha";
import { SeloV } from "@/lib/racha";
import { AbaEventos, AbaCorreio } from "./AdminV88"; // v88: os eventos, o correio e os avisos do jogo

const NOME_CARGO: Record<string, string> = {
  dono: "Dono",
  administrador: "Administrador",
  moderador: "Moderador",
  ajudante: "Ajudante",
};

type EstadoPainel = {
  logado: boolean;
  totpVerificado?: boolean;
  usuario?: { nome: string; username: string; avatarEmoji: string };
  cargo?: string;
  permissoes?: string[];
};

export default function AdminPage() {
  const estado = trpc.admin.estadoPainel.useQuery(undefined, { retry: false });
  if (estado.isLoading) return <div className="mt-16 text-center text-[#b0a6e8]">Abrindo o RACHA CONTROL...</div>;
  const e = (estado.data ?? { logado: false }) as EstadoPainel;
  if (!e.logado) return <LoginPainel />;
  if (!e.totpVerificado) return <Tela2FA />;
  return <Painel cargo={e.cargo!} permissoes={e.permissoes ?? []} usuario={e.usuario!} />;
}

// ============================================================================
// LOGIN DO PAINEL
// ============================================================================
function LoginPainel() {
  const [username, setUsername] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [pendente, setPendente] = useState<{ token: string; url2fa: string | null } | null>(null);
  const [codigo, setCodigo] = useState("");
  const utils = trpc.useUtils();

  const login = trpc.admin.loginPainel.useMutation({
    onSuccess: (r) => setPendente({ token: r.token, url2fa: r.url2fa }),
    onError: (e) => setErro(e.message),
  });
  const verificar = trpc.admin.verificar2fa.useMutation({
    onSuccess: () => utils.admin.estadoPainel.invalidate(),
    onError: (e) => setErro(e.message),
  });

  return (
    <div className="mx-auto mt-10 max-w-sm">
      <div className="cartao-rua overflow-hidden">
        <div className="bg-gradient-to-r from-[#1b1540] to-[#3b2a8f] px-6 py-4 text-center">
          <div className="texto-pixo text-2xl">🛡 RACHA CONTROL</div>
          <div className="mt-1 text-xs tracking-widest text-[#b0a6e8]">ACESSO RESTRITO À EQUIPE</div>
        </div>
        {!pendente ? (
          <form className="space-y-3 p-6" onSubmit={(e) => { e.preventDefault(); setErro(""); login.mutate({ username: username.trim(), senha }); }}>
            <input className="input-racha" placeholder="Usuário da equipe" value={username} onChange={(e) => setUsername(e.target.value)} />
            <input className="input-racha" type="password" placeholder="Senha" value={senha} onChange={(e) => setSenha(e.target.value)} />
            {erro && <div className="rounded-xl border-2 border-[#e03131] bg-[#e03131]/15 px-3 py-2 text-sm text-[#ffb4a8]">{erro}</div>}
            <button className="botao-racha botao-roxo w-full px-4 py-3" disabled={login.isPending}>
              {login.isPending ? "VERIFICANDO..." : "ENTRAR NO PAINEL"}
            </button>
            <p className="text-center text-xs text-[#6f6699]">Todas as tentativas são registradas na auditoria.</p>
          </form>
        ) : (
          <form className="space-y-3 p-6" onSubmit={(e) => { e.preventDefault(); setErro(""); verificar.mutate({ token: pendente.token, codigo: codigo.trim() }); }}>
            {pendente.url2fa && (
              <div className="rounded-xl border-2 border-[#ffd23f] bg-[#ffd23f]/10 p-3 text-sm">
                <b>Configure seu 2FA:</b> adicione esta chave no seu app autenticador (Google Authenticator, Authy...):
                <div className="mt-2 select-all break-all rounded-lg bg-black/50 p-2 font-mono text-xs text-[#ffd23f]">{pendente.url2fa}</div>
              </div>
            )}
            <label className="block text-xs tracking-widest text-[#b0a6e8]">CÓDIGO DO APP AUTENTICADOR</label>
            <input className="input-racha text-center font-mono text-2xl tracking-[8px]" placeholder="000000" maxLength={6} value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))} />
            {erro && <div className="rounded-xl border-2 border-[#e03131] bg-[#e03131]/15 px-3 py-2 text-sm text-[#ffb4a8]">{erro}</div>}
            <button className="botao-racha botao-verde w-full px-4 py-3" disabled={verificar.isPending}>
              {verificar.isPending ? "CONFIRMANDO..." : "CONFIRMAR 2FA"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Tela2FA() {
  return (
    <div className="mx-auto mt-16 max-w-sm text-center">
      <div className="text-5xl">🔐</div>
      <p className="mt-3 text-[#b0a6e8]">Sessão do painel sem 2FA verificado. Faça login de novo.</p>
      <BotaoSairPainel />
    </div>
  );
}

function BotaoSairPainel() {
  const utils = trpc.useUtils();
  const sair = trpc.admin.sairPainel.useMutation({ onSettled: () => utils.admin.estadoPainel.invalidate() });
  return (
    <button className="botao-racha botao-fantasma mt-4 px-4 py-2 text-sm" onClick={() => sair.mutate()}>
      SAIR DO PAINEL
    </button>
  );
}

// ============================================================================
// PAINEL PRINCIPAL
// ============================================================================
const ABAS_PAINEL = [
  { id: "jogadores", rotulo: "👥 Jogadores", perm: "consultar_jogadores" },
  { id: "recompensas", rotulo: "🎁 Recompensas", perm: "enviar_itens" },
  { id: "denuncias", rotulo: "🚩 Denúncias", perm: "analisar_denuncias" },
  { id: "eventos", rotulo: "📅 Eventos", perm: "gerenciar_eventos" }, // v88
  { id: "correio", rotulo: "✉️ Correio", perm: "enviar_itens" }, // v88
  { id: "equipe", rotulo: "🛡 Equipe", perm: "gerenciar_equipe" },
  { id: "registros", rotulo: "📜 Registros", perm: "consultar_registros" },
] as const;

function Painel({ cargo, permissoes, usuario }: { cargo: string; permissoes: string[]; usuario: { nome: string; username: string; avatarEmoji: string } }) {
  const tem = (p: string) => permissoes.includes(p);
  const abasVisiveis = ABAS_PAINEL.filter((a) => tem(a.perm) || (a.id === "denuncias" && tem("ver_denuncias_atribuidas")));
  const [aba, setAba] = useState<string>(abasVisiveis[0]?.id ?? "jogadores");
  const dash = trpc.admin.dashboard.useQuery(undefined, { enabled: tem("consultar_jogadores") });

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="cartao-rua flex flex-wrap items-center gap-3 p-4">
        <span className="text-3xl">{usuario.avatarEmoji}</span>
        <div className="flex-1">
          <div className="texto-pixo text-xl leading-none">RACHA CONTROL</div>
          <div className="mt-1 text-xs text-[#b0a6e8]">
            {usuario.nome} · <span className="text-[#ffd23f]">{NOME_CARGO[cargo] ?? cargo}</span>
          </div>
        </div>
        {dash.data && (
          <div className="flex gap-3 text-center text-xs">
            <MiniStat n={dash.data.jogadores} r="JOGADORES" />
            <MiniStat n={dash.data.novosHoje} r="NOVOS HOJE" />
            <MiniStat n={dash.data.denunciasAbertas} r="DENÚNCIAS" />
            <MiniStat n={dash.data.selosConcedidos} r="SELOS" />
          </div>
        )}
        <BotaoSairPainel />
      </div>

      <div className="flex gap-1 overflow-x-auto">
        {abasVisiveis.map((a) => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={`flex-none rounded-xl px-4 py-2 text-sm transition ${aba === a.id ? "bg-[#ffd23f] text-[#3a2000]" : "bg-black/30 text-[#b0a6e8] hover:text-white"}`}
          >
            {a.rotulo}
          </button>
        ))}
      </div>

      {aba === "jogadores" && <AbaJogadores tem={tem} />}
      {aba === "recompensas" && <AbaRecompensas tem={tem} />}
      {aba === "denuncias" && <AbaDenuncias />}
      {aba === "eventos" && <AbaEventos />}
      {aba === "correio" && <AbaCorreio tem={tem} />}
      {aba === "equipe" && <AbaEquipe />}
      {aba === "registros" && <AbaRegistros tem={tem} />}
    </div>
  );
}

function MiniStat({ n, r }: { n: number; r: string }) {
  return (
    <div className="rounded-xl border-2 border-[#33286b] bg-black/30 px-3 py-1.5">
      <div className="texto-pixo text-lg leading-none">{n}</div>
      <div className="mt-0.5 text-[9px] tracking-wider text-[#b0a6e8]">{r}</div>
    </div>
  );
}

// ---------- Modal de confirmação (obrigatório em operações críticas) ----------
function Confirmar({
  titulo, children, aoConfirmar, aoCancelar, textoBotao = "CONFIRMAR", perigoso,
}: {
  titulo: string; children: React.ReactNode; aoConfirmar: () => void; aoCancelar: () => void; textoBotao?: string; perigoso?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={aoCancelar}>
      <div className="cartao-rua w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="texto-pixo text-xl">{titulo}</h3>
        <div className="mt-3 text-sm text-[#d8d2f5]">{children}</div>
        <div className="mt-4 flex gap-2">
          <button className={`botao-racha flex-1 px-3 py-2 text-sm ${perigoso ? "botao-amarelo" : "botao-verde"}`} onClick={aoConfirmar}>
            {textoBotao}
          </button>
          <button className="botao-racha botao-fantasma flex-1 px-3 py-2 text-sm" onClick={aoCancelar}>
            CANCELAR
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ABA JOGADORES — GERENCIAR JOGADOR por ID/nome
// ============================================================================
function AbaJogadores({ tem }: { tem: (p: string) => boolean }) {
  const [busca, setBusca] = useState("");
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const resultado = trpc.admin.buscarJogador.useQuery({ termo: busca }, { enabled: busca.trim().length >= 1, retry: false });

  return (
    <div className="space-y-4">
      <div className="cartao-rua p-5">
        <h3 className="texto-pixo text-xl">GERENCIAR JOGADOR</h3>
        <div className="mt-3 flex gap-2">
          <input className="input-racha" placeholder="ID público (000123) ou usuário" value={busca} onChange={(e) => { setBusca(e.target.value); setSelecionado(null); }} />
        </div>
        <div className="mt-3 space-y-1.5">
          {resultado.data?.map((j) => (
            <button
              key={j.idPublico}
              onClick={() => setSelecionado(j.idPublico === selecionado ? null : j.idPublico)}
              className={`flex w-full items-center gap-3 rounded-xl border-2 px-3 py-2 text-left transition ${
                selecionado === j.idPublico ? "border-[#ffd23f] bg-[#ffd23f]/8" : "border-[#33286b] bg-black/30 hover:border-[#7048e8]"
              }`}
            >
              <span className="text-2xl">{j.avatarEmoji}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span>{j.nomeExibicao}</span>
                  {j.selos.map((s) => (
                    <SeloV key={s} selo={s} tamanho={16} />
                  ))}
                  {j.cargo && <span className="rounded-md bg-[#5f3dc4] px-1.5 py-0.5 text-[10px]">{NOME_CARGO[j.cargo]}</span>}
                </div>
                <div className="text-xs text-[#b0a6e8]">
                  ID {j.idPublico} · Nv. {j.nivel} · {j.titulo} ·{" "}
                  <span className={j.estado === "ativo" ? "text-[#7be04a]" : "text-[#ff922b]"}>
                    {j.estado.toUpperCase()}{j.suspensoAte ? ` até ${new Date(j.suspensoAte).toLocaleDateString("pt-BR")}` : ""}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selecionado && <DetalheJogador idPublico={selecionado} tem={tem} />}
    </div>
  );
}

function DetalheJogador({ idPublico, tem }: { idPublico: string; tem: (p: string) => boolean }) {
  const lista = trpc.admin.buscarJogador.useQuery({ termo: idPublico });
  const inventario = trpc.admin.inventarioDoJogador.useQuery({ termo: idPublico });
  const utils = trpc.useUtils();
  const [msg, setMsg] = useState("");
  const [confirm, setConfirm] = useState<null | { tipo: string; payload: () => void; resumo: React.ReactNode }>(null);

  const j = lista.data?.[0];
  const invalida = () => { utils.admin.buscarJogador.invalidate(); utils.admin.inventarioDoJogador.invalidate(); };

  const concederItem = trpc.admin.concederItem.useMutation({
    onSuccess: (r) => { setMsg(r.resultado === "ja_possuia" ? `${r.jogador} já possuía ${r.item}.` : `${r.item} entregue para ${r.jogador}!`); invalida(); },
    onError: (e) => setMsg(e.message),
  });
  const revogarItem = trpc.admin.revogarItem.useMutation({ onSuccess: () => { setMsg("Item revogado."); invalida(); }, onError: (e) => setMsg(e.message) });
  const selo = trpc.admin.gerenciarSelo.useMutation({ onSuccess: () => { setMsg("Selo atualizado."); invalida(); }, onError: (e) => setMsg(e.message) });
  const punir = trpc.admin.punir.useMutation({ onSuccess: (r) => { setMsg(`Punição aplicada em ${r.jogador}.`); invalida(); }, onError: (e) => setMsg(e.message) });
  const revogarPunicao = trpc.admin.revogarPunicao.useMutation({ onSuccess: () => { setMsg("Punição revogada."); invalida(); }, onError: (e) => setMsg(e.message) });
  // v82: a patente da ranqueada (zerar quem trapaceou, devolver pontos perdidos por erro)
  const ajustarPatente = trpc.admin.ajustarPatente.useMutation({ onSuccess: (r) => { setMsg(`Patente de ${r.jogador}: ${r.antes} → ${r.depois} pontos (${r.patente}).`); invalida(); }, onError: (e) => setMsg(e.message) });
  const [ptsPatente, setPtsPatente] = useState(0);
  const [motivoPatente, setMotivoPatente] = useState("");

  const [itemEscolhido, setItemEscolhido] = useState("banner_campeao_evento");
  const [motivoPunicao, setMotivoPunicao] = useState("");
  const [horasSuspensao, setHorasSuspensao] = useState(24);

  if (!j) return null;
  const itensPorCategoria = (cat: string) => CATALOGO_ITENS.filter((i) => i.categoria === cat);

  return (
    <div className="cartao-rua p-5">
      <h3 className="texto-pixo text-xl">JOGADOR {j.idPublico} — {j.nomeExibicao}</h3>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-[#b0a6e8] sm:grid-cols-4">
        <div>Conta: <b className="text-white">{j.estado}</b></div>
        <div>Criada: <b className="text-white">{new Date(j.criadoEm).toLocaleDateString("pt-BR")}</b></div>
        <div>Partidas: <b className="text-white">{j.stats?.partidas ?? 0}</b></div>
        <div>Itens: <b className="text-white">{j.totalItens}</b></div>
        <div>Patente: <b className="text-white">{j.patente.titulo} · {j.patente.pts} pts</b> ({j.patente.jogos} ranqueadas)</div>
      </div>
      {msg && <div className="mt-3 rounded-xl border-2 border-[#7048e8] bg-[#7048e8]/15 px-3 py-2 text-sm text-[#d0bfff]">{msg}</div>}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {/* conceder itens */}
        {tem("enviar_itens") && (
          <div className="rounded-xl border-2 border-[#33286b] bg-black/30 p-4">
            <h4 className="texto-pixo">CONCEDER RECOMPENSA</h4>
            <select className="input-racha mt-2" value={itemEscolhido} onChange={(e) => setItemEscolhido(e.target.value)}>
              {(["skin", "banner", "moldura", "titulo", "efeito"] as const).map((cat) => (
                <optgroup key={cat} label={cat.toUpperCase()}>
                  {itensPorCategoria(cat).map((i) => (
                    <option key={i.codigo} value={i.codigo}>{i.visual.emoji} {i.nome}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <button
              className="botao-racha botao-verde mt-2 w-full px-3 py-2 text-sm"
              onClick={() => setConfirm({
                tipo: "item",
                resumo: <>Enviar <b>{CATALOGO_ITENS.find((i) => i.codigo === itemEscolhido)?.nome}</b> para <b>{j.nomeExibicao}</b> (ID {j.idPublico})?</>,
                payload: () => concederItem.mutate({ termo: idPublico, codigoItem: itemEscolhido, confirmacao: true }),
              })}
            >
              ENVIAR PARA O JOGADOR
            </button>
          </div>
        )}

        {/* selos */}
        {tem("gerenciar_selos") && (
          <div className="rounded-xl border-2 border-[#33286b] bg-black/30 p-4">
            <h4 className="texto-pixo">SELOS OFICIAIS</h4>
            <div className="mt-2 space-y-1.5">
              {(Object.keys(SELO_INFO) as Selo[]).map((s) => {
                const tem2 = j.selos.includes(s);
                return (
                  <div key={s} className="flex items-center gap-2 rounded-lg border border-[#33286b] bg-black/30 px-2 py-1.5 text-sm">
                    <SeloV selo={s} tamanho={20} />
                    <span className="flex-1">{SELO_INFO[s].nome}{s === "verificado" ? " (influenciadores)" : ""}</span>
                    <button
                      className={`botao-racha px-2 py-0.5 text-xs ${tem2 ? "botao-fantasma text-[#f783ac]" : "botao-verde"}`}
                      onClick={() => setConfirm({
                        tipo: "selo",
                        resumo: <>{tem2 ? "Remover" : "Conceder"} o selo <b>{SELO_INFO[s].nome}</b> {tem2 ? "de" : "para"} <b>{j.nomeExibicao}</b>?</>,
                        payload: () => selo.mutate({ termo: idPublico, selo: s, acao: tem2 ? "remover" : "conceder", confirmacao: true }),
                      })}
                    >
                      {tem2 ? "REMOVER" : "CONCEDER"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* punições */}
        {(tem("advertir") || tem("suspender") || tem("aplicar_punicoes")) && (
          <div className="rounded-xl border-2 border-[#33286b] bg-black/30 p-4">
            <h4 className="texto-pixo">PUNIÇÕES</h4>
            <input className="input-racha mt-2" placeholder="Motivo (obrigatório)" value={motivoPunicao} onChange={(e) => setMotivoPunicao(e.target.value)} maxLength={300} />
            <div className="mt-2 flex items-center gap-2 text-sm">
              <span className="text-xs text-[#b0a6e8]">Suspensão (horas):</span>
              <input className="input-racha w-20" type="number" min={1} max={168} value={horasSuspensao} onChange={(e) => setHorasSuspensao(Number(e.target.value))} />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tem("advertir") && (
                <button className="botao-racha botao-fantasma px-2.5 py-1 text-xs" disabled={motivoPunicao.length < 3}
                  onClick={() => setConfirm({ tipo: "p", resumo: <>Advertir <b>{j.nomeExibicao}</b> por: {motivoPunicao}?</>, payload: () => punir.mutate({ termo: idPublico, tipo: "advertencia", motivo: motivoPunicao, confirmacao: true }) })}>
                  ⚠️ ADVERTIR
                </button>
              )}
              {tem("suspender") && (
                <button className="botao-racha botao-amarelo px-2.5 py-1 text-xs" disabled={motivoPunicao.length < 3}
                  onClick={() => setConfirm({ tipo: "p", resumo: <>Suspender <b>{j.nomeExibicao}</b> por <b>{horasSuspensao}h</b>. Motivo: {motivoPunicao}?</>, payload: () => punir.mutate({ termo: idPublico, tipo: "suspensao", motivo: motivoPunicao, horas: horasSuspensao, confirmacao: true }) })}>
                  ⏸ SUSPENDER
                </button>
              )}
              {tem("aplicar_punicoes") && (
                <button className="botao-racha botao-fantasma px-2.5 py-1 text-xs text-[#f783ac]" disabled={motivoPunicao.length < 3}
                  onClick={() => setConfirm({ tipo: "p", resumo: <>BANIR <b>{j.nomeExibicao}</b> permanentemente. Motivo: {motivoPunicao}?</>, payload: () => punir.mutate({ termo: idPublico, tipo: "banimento", motivo: motivoPunicao, confirmacao: true }) })}>
                  🚫 BANIR
                </button>
              )}
            </div>
            {j.punicoesAtivas.length > 0 && (
              <div className="mt-3 space-y-1">
                <div className="text-xs tracking-widest text-[#b0a6e8]">ATIVAS</div>
                {j.punicoesAtivas.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 rounded-lg border border-[#e03131]/40 bg-[#e03131]/10 px-2 py-1 text-xs">
                    <span className="flex-1">{p.tipo.toUpperCase()} · {p.motivo}{p.expiraEm ? ` · até ${new Date(p.expiraEm).toLocaleString("pt-BR")}` : ""}</span>
                    {tem("aplicar_punicoes") && (
                      <button className="text-[#7be04a] underline" onClick={() => revogarPunicao.mutate({ punicaoId: p.id, confirmacao: true })}>revogar</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* v82: a patente da ranqueada */}
        {tem("aplicar_punicoes") && (
          <div className="rounded-xl border-2 border-[#33286b] bg-black/30 p-4">
            <h4 className="texto-pixo">PATENTE DA RANQUEADA</h4>
            <div className="mt-1 text-xs text-[#b0a6e8]">Agora: <b className="text-white">{j.patente.titulo}</b> · {j.patente.pts} pontos · melhor {j.patente.melhor}</div>
            <div className="mt-2 flex items-center gap-2 text-sm">
              <span className="text-xs text-[#b0a6e8]">Novos pontos:</span>
              <input className="input-racha w-24" type="number" min={0} max={99999} value={ptsPatente} onChange={(e) => setPtsPatente(Math.max(0, Number(e.target.value) || 0))} />
            </div>
            <input className="input-racha mt-2" placeholder="Motivo (obrigatório)" value={motivoPatente} onChange={(e) => setMotivoPatente(e.target.value)} maxLength={300} />
            <button className="botao-racha botao-amarelo mt-2 px-2.5 py-1 text-xs" disabled={motivoPatente.length < 3}
              onClick={() => setConfirm({ tipo: "rq", resumo: <>Pôr a patente de <b>{j.nomeExibicao}</b> em <b>{ptsPatente}</b> pontos (era {j.patente.pts}). Motivo: {motivoPatente}?</>, payload: () => ajustarPatente.mutate({ termo: idPublico, pts: ptsPatente, motivo: motivoPatente, confirmacao: true }) })}>
              AJUSTAR A PATENTE
            </button>
            <p className="mt-2 text-[11px] text-[#6f6699]">Fica no histórico da patente da conta e na auditoria. Baixar a patente apaga o "melhor" de antes.</p>
          </div>
        )}

        {/* inventário + histórico */}
        <div className="rounded-xl border-2 border-[#33286b] bg-black/30 p-4">
          <h4 className="texto-pixo">INVENTÁRIO ({inventario.data?.length ?? 0})</h4>
          <div className="mt-2 max-h-44 space-y-1 overflow-y-auto">
            {inventario.data?.map((i) => (
              <div key={i.codigo} className="flex items-center gap-2 rounded-lg border border-[#33286b] bg-black/30 px-2 py-1 text-xs">
                <span className="flex-1">{i.nome} <span className="text-[#6f6699]">({i.categoria})</span></span>
                {tem("enviar_itens") && (
                  <button className="text-[#f783ac] underline"
                    onClick={() => setConfirm({ tipo: "r", resumo: <>Revogar <b>{i.nome}</b> de <b>{j.nomeExibicao}</b>?</>, payload: () => revogarItem.mutate({ termo: idPublico, codigoItem: i.codigo, confirmacao: true }) })}>
                    revogar
                  </button>
                )}
              </div>
            ))}
          </div>
          {j.historicoAdministrativo.length > 0 && (
            <>
              <h4 className="texto-pixo mt-3">HISTÓRICO ADMINISTRATIVO</h4>
              <div className="mt-1 max-h-32 space-y-1 overflow-y-auto text-xs text-[#b0a6e8]">
                {j.historicoAdministrativo.map((h, i) => (
                  <div key={i}>· {h.acao} ({h.cargo}) — {h.resultado} — {new Date(h.quando).toLocaleString("pt-BR")}</div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {confirm && (
        <Confirmar titulo="CONFIRMAR OPERAÇÃO" aoCancelar={() => setConfirm(null)} aoConfirmar={() => { confirm.payload(); setConfirm(null); }}>
          {confirm.resumo}
        </Confirmar>
      )}
    </div>
  );
}

// ============================================================================
// ABA RECOMPENSAS — individual / grupo / global
// ============================================================================
function AbaRecompensas({ tem }: { tem: (p: string) => boolean }) {
  const [tipo, setTipo] = useState<"individual" | "grupo" | "global">("individual");
  const [item, setItem] = useState("banner_campeao_evento");
  const [lista, setLista] = useState("");
  const [msg, setMsg] = useState("");
  const [confirmGlobal, setConfirmGlobal] = useState("");
  const [preview, setPreview] = useState(false);
  const chave = useMemo(() => `dist-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`, [tipo, item]);

  const historico = trpc.admin.historicoDistribuicoes.useQuery({ limite: 15 });
  const previsao = trpc.admin.preVisualizarGrupo.useQuery(
    { destinatarios: lista.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean) },
    { enabled: preview && tipo !== "global" && lista.trim().length > 0 },
  );
  const distribuir = trpc.admin.distribuir.useMutation({
    onSuccess: (r) => {
      setMsg(
        r.idempotent
          ? `Distribuição #${r.distribuicaoId} já havia sido processada (reenvio bloqueado, nada duplicado).`
          : `Distribuição #${r.distribuicaoId} concluída: ${r.entregues} entregues · ${r.jaPossuiam} já possuíam · ${r.falhas} falhas.`,
      );
      historico.refetch();
    },
    onError: (e) => setMsg(e.message),
  });

  const podeGlobal = tem("distribuir_global");
  const destinatarios = lista.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
  const itemInfo = CATALOGO_ITENS.find((i) => i.codigo === item);

  return (
    <div className="space-y-4">
      <div className="cartao-rua p-5">
        <h3 className="texto-pixo text-xl">DISTRIBUIR RECOMPENSAS</h3>
        <div className="mt-3 flex gap-1">
          {(["individual", "grupo", "global"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTipo(t); setPreview(false); setMsg(""); }}
              className={`flex-1 rounded-xl px-3 py-1.5 text-sm transition ${tipo === t ? "bg-[#ffd23f] text-[#3a2000]" : "bg-black/30 text-[#b0a6e8]"}`}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="mt-3">
          <label className="text-xs tracking-widest text-[#b0a6e8]">ITEM</label>
          <select className="input-racha mt-1" value={item} onChange={(e) => setItem(e.target.value)}>
            {CATALOGO_ITENS.map((i) => (
              <option key={i.codigo} value={i.codigo}>{i.visual.emoji} {i.nome} · {i.categoria}</option>
            ))}
          </select>
        </div>

        {tipo !== "global" && (
          <div className="mt-3">
            <label className="text-xs tracking-widest text-[#b0a6e8]">
              DESTINATÁRIOS {tipo === "individual" ? "(1 ID ou usuário)" : "(IDs ou usuários, um por linha)"}
            </label>
            <textarea
              className="input-racha mt-1 min-h-20"
              placeholder={tipo === "individual" ? "000123" : "000123\n000456\ncraque.da.quebrada"}
              value={lista}
              onChange={(e) => { setLista(e.target.value); setPreview(false); }}
            />
            {tipo === "grupo" && destinatarios.length > 0 && (
              <button className="botao-racha botao-fantasma mt-2 px-3 py-1 text-xs" onClick={() => setPreview(true)}>
                PRÉ-VISUALIZAR {destinatarios.length} DESTINATÁRIOS
              </button>
            )}
            {preview && previsao.data && (
              <div className="mt-2 max-h-36 space-y-1 overflow-y-auto rounded-xl border-2 border-[#33286b] bg-black/30 p-2 text-xs">
                {previsao.data.map((p, i) => (
                  <div key={i} className={p.encontrado ? "text-[#7be04a]" : "text-[#f783ac]"}>
                    {p.encontrado ? `✔ ${p.nome} (ID ${p.idPublico})` : `✘ "${p.termo}" não encontrado`}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tipo === "global" && (
          <div className="mt-3 rounded-xl border-2 border-[#ffd23f] bg-[#ffd23f]/10 p-3 text-sm">
            ⚠️ Distribuição GLOBAL atinge <b>todos os jogadores ativos</b> e exige permissão específica.
            {podeGlobal ? (
              <>
                <div className="mt-2 text-xs">Digite <b>DISTRIBUIR</b> para liberar:</div>
                <input className="input-racha mt-1" value={confirmGlobal} onChange={(e) => setConfirmGlobal(e.target.value)} placeholder="DISTRIBUIR" />
              </>
            ) : (
              <div className="mt-1 text-[#ffb4a8]">Seu cargo não tem a permissão "distribuir_global".</div>
            )}
          </div>
        )}

        {msg && <div className="mt-3 rounded-xl border-2 border-[#7048e8] bg-[#7048e8]/15 px-3 py-2 text-sm text-[#d0bfff]">{msg}</div>}

        <button
          className="botao-racha botao-verde mt-4 w-full px-4 py-3"
          disabled={distribuir.isPending || (tipo === "global" && (!podeGlobal || confirmGlobal !== "DISTRIBUIR")) || (tipo !== "global" && destinatarios.length === 0)}
          onClick={() =>
            distribuir.mutate({
              tipo,
              codigoItem: item,
              destinatarios: tipo === "global" ? undefined : destinatarios,
              chaveIdempotencia: chave,
              confirmacao: true,
              confirmacaoGlobal: tipo === "global" ? confirmGlobal : undefined,
            })
          }
        >
          {distribuir.isPending ? "PROCESSANDO..." : `ENVIAR ${itemInfo?.nome?.toUpperCase()} ${tipo === "global" ? "PARA TODOS" : ""}`}
        </button>
        <p className="mt-2 text-center text-xs text-[#6f6699]">
          Processamento idempotente: o reenvio com a mesma chave nunca duplica itens. Itens que o jogador já tem são pulados e registrados.
        </p>
      </div>

      <div className="cartao-rua p-5">
        <h3 className="texto-pixo text-xl">DISTRIBUIÇÕES RECENTES</h3>
        <div className="mt-3 space-y-1.5">
          {historico.data?.map((d) => (
            <div key={d.id} className="flex items-center gap-3 rounded-xl border border-[#33286b] bg-black/30 px-3 py-2 text-xs">
              <span className="rounded-md bg-[#5f3dc4] px-2 py-0.5">{d.tipo.toUpperCase()}</span>
              <span className="flex-1">{d.item}</span>
              <span className="text-[#7be04a]">{d.entregues} ✔</span>
              <span className="text-[#b0a6e8]">{d.jaPossuiam} já tinham</span>
              {d.falhas > 0 && <span className="text-[#f783ac]">{d.falhas} ✘</span>}
              <span className="text-[#6f6699]">{new Date(d.criadaEm).toLocaleDateString("pt-BR")}</span>
            </div>
          ))}
          {!historico.data?.length && <p className="text-sm text-[#b0a6e8]">Nenhuma distribuição ainda.</p>}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ABA DENÚNCIAS
// ============================================================================
function AbaDenuncias() {
  const [estado, setEstado] = useState<"aberta" | "em_analise" | "resolvida" | "arquivada" | "todas">("aberta");
  const denuncias = trpc.admin.listarDenuncias.useQuery({ estado });
  const utils = trpc.useUtils();
  const [msg, setMsg] = useState("");
  const atualizar = trpc.admin.atualizarDenuncia.useMutation({
    onSuccess: () => { setMsg("Denúncia atualizada."); utils.admin.listarDenuncias.invalidate(); },
    onError: (e) => setMsg(e.message),
  });

  return (
    <div className="cartao-rua p-5">
      <h3 className="texto-pixo text-xl">DENÚNCIAS</h3>
      <div className="mt-3 flex gap-1 overflow-x-auto">
        {(["aberta", "em_analise", "resolvida", "arquivada", "todas"] as const).map((e) => (
          <button key={e} onClick={() => setEstado(e)} className={`flex-none rounded-xl px-3 py-1.5 text-xs transition ${estado === e ? "bg-[#ffd23f] text-[#3a2000]" : "bg-black/30 text-[#b0a6e8]"}`}>
            {e.replace("_", " ").toUpperCase()}
          </button>
        ))}
      </div>
      {msg && <div className="mt-2 rounded-xl border-2 border-[#7048e8] bg-[#7048e8]/15 px-3 py-2 text-sm text-[#d0bfff]">{msg}</div>}
      <div className="mt-3 space-y-2">
        {!denuncias.data?.length && <p className="text-sm text-[#b0a6e8]">Nada por aqui. Quadra limpa! ✨</p>}
        {denuncias.data?.map((d) => (
          <div key={d.id} className="rounded-xl border-2 border-[#33286b] bg-black/30 p-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-md bg-[#e03131]/20 px-2 py-0.5 text-xs text-[#ffb4a8]">{d.motivo}</span>
              <span><b>{d.autor?.nome}</b> <span className="text-[#6f6699]">({d.autor?.idPublico})</span> denunciou <b>{d.alvo?.nome}</b> <span className="text-[#6f6699]">({d.alvo?.idPublico})</span></span>
              <span className="flex-1" />
              <span className="text-[10px] text-[#6f6699]">{new Date(d.criadaEm).toLocaleString("pt-BR")}</span>
            </div>
            {d.detalhes && <div className="mt-1 text-xs text-[#b0a6e8]">“{d.detalhes}”</div>}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {d.estado === "aberta" && (
                <button className="botao-racha botao-fantasma px-2.5 py-1 text-xs" onClick={() => atualizar.mutate({ id: d.id, estado: "em_analise", atribuirAMim: true })}>
                  ASSUMIR ANÁLISE
                </button>
              )}
              {d.estado !== "resolvida" && (
                <button className="botao-racha botao-verde px-2.5 py-1 text-xs" onClick={() => atualizar.mutate({ id: d.id, estado: "resolvida" })}>
                  RESOLVER
                </button>
              )}
              {d.estado !== "arquivada" && (
                <button className="botao-racha botao-fantasma px-2.5 py-1 text-xs" onClick={() => atualizar.mutate({ id: d.id, estado: "arquivada" })}>
                  ARQUIVAR
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// ABA EQUIPE
// ============================================================================
function AbaEquipe() {
  const equipe = trpc.admin.listarEquipe.useQuery();
  const utils = trpc.useUtils();
  const [termo, setTermo] = useState("");
  const [cargo, setCargo] = useState<"dono" | "administrador" | "moderador" | "ajudante">("ajudante");
  const [msg, setMsg] = useState("");
  const [confirm, setConfirm] = useState<null | { resumo: React.ReactNode; payload: () => void }>(null);

  const definir = trpc.admin.definirCargo.useMutation({
    onSuccess: (r) => { setMsg(`Cargo definido para ${r.jogador}.`); utils.admin.listarEquipe.invalidate(); },
    onError: (e) => setMsg(e.message),
  });
  const remover = trpc.admin.removerCargo.useMutation({
    onSuccess: () => { setMsg("Cargo removido."); utils.admin.listarEquipe.invalidate(); },
    onError: (e) => setMsg(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="cartao-rua p-5">
        <h3 className="texto-pixo text-xl">ADICIONAR À EQUIPE</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <input className="input-racha flex-1" placeholder="ID ou usuário" value={termo} onChange={(e) => setTermo(e.target.value)} />
          <select className="input-racha w-auto" value={cargo} onChange={(e) => setCargo(e.target.value as typeof cargo)}>
            <option value="ajudante">Ajudante</option>
            <option value="moderador">Moderador</option>
            <option value="administrador">Administrador</option>
            <option value="dono">Dono</option>
          </select>
          <button
            className="botao-racha botao-verde px-4 py-2 text-sm"
            disabled={!termo.trim()}
            onClick={() => setConfirm({
              resumo: <>Dar o cargo de <b>{NOME_CARGO[cargo]}</b> para <b>{termo}</b>? A pessoa precisará configurar 2FA no próximo login do painel.</>,
              payload: () => definir.mutate({ termo: termo.trim(), cargo, confirmacao: true }),
            })}
          >
            DEFINIR CARGO
          </button>
        </div>
        {msg && <div className="mt-2 rounded-xl border-2 border-[#7048e8] bg-[#7048e8]/15 px-3 py-2 text-sm text-[#d0bfff]">{msg}</div>}
      </div>

      <div className="cartao-rua p-5">
        <h3 className="texto-pixo text-xl">EQUIPE ATUAL</h3>
        <div className="mt-3 space-y-1.5">
          {equipe.data?.map((m) => (
            <div key={m.usuarioId} className="flex items-center gap-3 rounded-xl border border-[#33286b] bg-black/30 px-3 py-2">
              <span className="text-2xl">{m.jogador?.avatarEmoji}</span>
              <div className="min-w-0 flex-1">
                <div>{m.jogador?.nome} <span className="text-xs text-[#6f6699]">@{m.jogador?.username} · ID {m.jogador?.idPublico}</span></div>
                <div className="text-xs text-[#b197fc]">{NOME_CARGO[m.cargo]}</div>
              </div>
              {m.cargo !== "dono" && (
                <button
                  className="botao-racha botao-fantasma flex-none px-2.5 py-1 text-xs text-[#f783ac]"
                  onClick={() => setConfirm({
                    resumo: <>Remover <b>{m.jogador?.nome}</b> da equipe? As sessões de painel dele caem na hora.</>,
                    payload: () => remover.mutate({ termo: m.jogador!.idPublico, confirmacao: true }),
                  })}
                >
                  REMOVER
                </button>
              )}
              {m.cargo === "dono" && <span className="text-xs text-[#ffd23f]">👑 PROTEGIDO</span>}
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-[#6f6699]">
          Hierarquia: só o Dono mexe em administradores e no cargo de Dono. Ninguém altera o próprio cargo nem age sobre cargos iguais ou maiores.
        </p>
      </div>

      {confirm && (
        <Confirmar titulo="CONFIRMAR" aoCancelar={() => setConfirm(null)} aoConfirmar={() => { confirm.payload(); setConfirm(null); }}>
          {confirm.resumo}
        </Confirmar>
      )}
    </div>
  );
}

// ============================================================================
// ABA REGISTROS (auditoria)
// ============================================================================
function AbaRegistros({ tem }: { tem: (p: string) => boolean }) {
  const registros = trpc.admin.registros.useQuery({ limite: 100 }, { enabled: tem("consultar_registros") });
  return (
    <div className="cartao-rua p-5">
      <h3 className="texto-pixo text-xl">REGISTRO DE AUDITORIA</h3>
      <p className="mt-1 text-xs text-[#6f6699]">Operador, alvo, ação, data e resultado de toda ação crítica.</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b-2 border-[#33286b] text-[#b0a6e8]">
              <th className="px-2 py-2">QUANDO</th>
              <th className="px-2 py-2">OPERADOR</th>
              <th className="px-2 py-2">AÇÃO</th>
              <th className="px-2 py-2">ALVO</th>
              <th className="px-2 py-2">RESULTADO</th>
            </tr>
          </thead>
          <tbody>
            {registros.data?.map((r) => (
              <tr key={r.id} className="border-b border-[#241b56]">
                <td className="whitespace-nowrap px-2 py-1.5 text-[#6f6699]">{new Date(r.quando).toLocaleString("pt-BR")}</td>
                <td className="px-2 py-1.5">{r.operador.nome} <span className="text-[#6f6699]">({r.operador.cargo})</span></td>
                <td className="px-2 py-1.5">{r.acao}</td>
                <td className="px-2 py-1.5">{r.alvo ? `${r.alvo.nome} (${r.alvo.idPublico})` : "—"}</td>
                <td className={`px-2 py-1.5 ${r.resultado === "ok" ? "text-[#7be04a]" : r.resultado === "negado" ? "text-[#ffb4a8]" : "text-[#f783ac]"}`}>
                  {r.resultado.toUpperCase()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!registros.data?.length && <p className="mt-3 text-sm text-[#b0a6e8]">Sem registros ainda.</p>}
      </div>
    </div>
  );
}
