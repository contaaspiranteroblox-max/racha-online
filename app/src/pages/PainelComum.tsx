// ============================================================================
// RACHA v109 — RACHA CONTROL: o que o PAINEL DO DONO e o PAINEL DA STAFF usam junto — a busca e a FICHA do jogador (com a
// moderação: silenciar o chat, banir, advertir, tirar da sala, trocar o nome, as notas; e, só no painel do Dono, os selos, a
// carteira, os itens e a patente), os PUNIDOS, as DENÚNCIAS com as ações direto delas e MEUS REGISTROS.
// O servidor confere tudo de novo (o cargo, o teto do cargo, a hierarquia): o painel só esconde o que o cargo não pode.
// ============================================================================
import { useState, type ReactNode } from "react";
import { trpc } from "@/providers/trpc";
import { CATALOGO_ITENS, SELO_INFO, type Selo } from "@contracts/racha";
import { SeloV } from "@/lib/racha";

export type Modo = "dono" | "staff";
export type Opcoes = {
  cargo: string;
  nomeCargo: string;
  permissoes: string[];
  silencio: { min: number; rotulo: string }[];
  banir: { horas: number; rotulo: string }[];
};
export const COR_PAINEL: Record<Modo, string> = { dono: "#ffd23f", staff: "#3bc9db" };
export const NOME_CARGO: Record<string, string> = { dono: "Dono", administrador: "Administrador", moderador: "Moderador", ajudante: "Ajudante" };

export const quando = (t: string | number | Date | null | undefined) => (t ? new Date(t).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—");
export function falta(t: string | number | Date | null | undefined): string {
  if (!t) return "";
  const ms = new Date(t).getTime() - Date.now();
  if (ms <= 0) return "acabou";
  const min = Math.ceil(ms / 60000);
  if (min < 60) return `${min} min`;
  const h = Math.ceil(min / 60);
  if (h < 48) return `${h} h`;
  return `${Math.ceil(h / 24)} dias`;
}

// os rótulos das ações (os registros)
export const ROTULO_ACAO: Record<string, string> = {
  login_painel: "Entrou no painel", "2fa_ok": "Confirmou o 2FA", "2fa_errado": "Errou o código do 2FA", ver_ficha: "Olhou a ficha",
  silenciar: "Silenciou o chat", banir: "Baniu por um tempo", banir_para_sempre: "Baniu para sempre", advertir: "Advertiu",
  expulsar: "Tirou da sala", trocar_nome: "Trocou o nome", anotar: "Escreveu uma nota", tirar_punicao: "Tirou uma punição",
  resolver_denuncia: "Resolveu uma denúncia", denuncia_estado: "Mudou uma denúncia", punir_advertencia: "Advertiu", punir_suspensao: "Suspendeu",
  punir_banimento: "Baniu para sempre", revogar_punicao: "Tirou uma punição", ajustar_patente: "Mexeu na patente", conceder_item: "Deu um item",
  revogar_item: "Tirou um item", conceder_selo: "Deu um selo", remover_selo: "Tirou um selo", carteira: "Mexeu na carteira",
  definir_cargo: "Deu um cargo", remover_cargo: "Tirou o cargo", definir_permissoes: "Ajustou as permissões", resetar_2fa: "Resetou o 2FA",
  encerrar_sessoes: "Encerrou as sessões do painel", atualizar_denuncia: "Mudou uma denúncia",
  sem_permissao: "Tentou sem permissão", ver_carteira: "Tentou ver a carteira", ver_equipe: "Tentou ver a equipe", ver_registros: "Tentou ver os registros",
};
const TIPO_PUNICAO: Record<string, string> = { silencio: "🔇 SILÊNCIO NO CHAT", suspensao: "⏸ BANIDO POR UM TEMPO", banimento: "🚫 BANIDO PARA SEMPRE", advertencia: "⚠️ ADVERTÊNCIA" };

// o resumo legível dos detalhes de um registro
export function resumoDetalhes(d: unknown): string {
  if (!d || typeof d !== "object") return "";
  const o = d as Record<string, unknown>;
  const partes: string[] = [];
  if (o.tempo) partes.push(String(o.tempo));
  if (o.motivo && typeof o.motivo === "string") partes.push(`motivo: ${o.motivo}`);
  if (o.antes !== undefined && o.depois !== undefined && typeof o.antes !== "object") partes.push(`${String(o.antes)} → ${String(o.depois)}`);
  if (typeof o.moedas === "number" && o.moedas) partes.push(`${o.moedas > 0 ? "+" : ""}${o.moedas} moedas`);
  if (typeof o.gemas === "number" && o.gemas) partes.push(`${o.gemas > 0 ? "+" : ""}${o.gemas} gemas`);
  if (o.selo) partes.push(`selo ${String(o.selo)}`);
  if (o.item) partes.push(`item ${String(o.item)}`);
  if (o.cargo && typeof o.cargo === "string") partes.push(`cargo ${NOME_CARGO[o.cargo] ?? o.cargo}`);
  if (o.texto && typeof o.texto === "string") partes.push(`“${o.texto}”`);
  if (o.tipo && typeof o.tipo === "string") partes.push(o.tipo);
  if (o.denuncia) partes.push(`denúncia #${String(o.denuncia)}`);
  if (o.permissao) partes.push(`a permissão "${String(o.permissao)}"`);
  return partes.join(" · ");
}

export function Aviso({ msg, erro }: { msg: string; erro?: boolean }) {
  if (!msg) return null;
  return (
    <div data-testid="aviso-painel" className={`mt-3 rounded-xl border-2 px-3 py-2 text-sm ${erro ? "border-[#e03131] bg-[#e03131]/15 text-[#ffb4a8]" : "border-[#7048e8] bg-[#7048e8]/15 text-[#d0bfff]"}`}>
      {msg}
    </div>
  );
}

// ---------- o modal de confirmação (toda ação que muda alguma coisa passa por ele) ----------
export function Confirmar({
  titulo, children, aoConfirmar, aoCancelar, textoBotao = "CONFIRMAR", perigoso,
}: {
  titulo: string; children: ReactNode; aoConfirmar: () => void; aoCancelar: () => void; textoBotao?: string; perigoso?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={aoCancelar}>
      <div className="cartao-rua w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()} data-testid="confirmar">
        <h3 className="texto-pixo text-xl">{titulo}</h3>
        <div className="mt-3 text-sm text-[#d8d2f5]">{children}</div>
        <div className="mt-4 flex gap-2">
          <button data-testid="confirmar-ok" className={`botao-racha flex-1 px-3 py-2 text-sm ${perigoso ? "botao-amarelo" : "botao-verde"}`} onClick={aoConfirmar}>
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

export function MiniStat({ n, r }: { n: number | string; r: string }) {
  return (
    <div className="rounded-xl border-2 border-[#33286b] bg-black/30 px-3 py-1.5">
      <div className="texto-pixo text-lg leading-none">{n}</div>
      <div className="mt-0.5 text-[9px] tracking-wider text-[#b0a6e8]">{r}</div>
    </div>
  );
}

export function Abas({ abas, aba, setAba, cor }: { abas: { id: string; rotulo: string }[]; aba: string; setAba: (a: string) => void; cor: string }) {
  return (
    <div className="flex gap-1 overflow-x-auto sm:flex-wrap" data-testid="abas-painel">
      {abas.map((a) => (
        <button
          key={a.id}
          data-testid={"aba-" + a.id}
          onClick={() => setAba(a.id)}
          className="flex-none rounded-xl px-4 py-2 text-sm transition"
          style={aba === a.id ? { background: cor, color: "#1b1240" } : { background: "rgba(0,0,0,.3)", color: "#b0a6e8" }}
        >
          {a.rotulo}
        </button>
      ))}
    </div>
  );
}

type Pendente = { titulo: string; resumo: ReactNode; faz: () => void; perigoso?: boolean } | null;

// ============================================================================
// A BUSCA DO JOGADOR + A FICHA
// ============================================================================
export function BuscaJogador({ modo, tem, opcoes, inicial }: { modo: Modo; tem: (p: string) => boolean; opcoes?: Opcoes; inicial?: string }) {
  const [busca, setBusca] = useState(inicial ?? "");
  const [selecionado, setSelecionado] = useState<string | null>(inicial ?? null);
  const resultado = trpc.admin.buscarJogador.useQuery({ termo: busca }, { enabled: busca.trim().length >= 1, retry: false });
  return (
    <div className="space-y-4">
      <div className="cartao-rua p-5">
        <h3 className="texto-pixo text-xl">ACHAR JOGADOR</h3>
        <input data-testid="busca-jogador" className="input-racha mt-3" placeholder="ID público (000123) ou usuário" value={busca} onChange={(e) => { setBusca(e.target.value); setSelecionado(null); }} />
        <div className="mt-3 space-y-1.5">
          {resultado.data?.map((j) => (
            <button
              key={j.idPublico}
              data-testid={"resultado-" + j.idPublico}
              onClick={() => setSelecionado(j.idPublico === selecionado ? null : j.idPublico)}
              className={`flex w-full items-center gap-3 rounded-xl border-2 px-3 py-2 text-left transition ${selecionado === j.idPublico ? "border-[#ffd23f] bg-[#ffd23f]/8" : "border-[#33286b] bg-black/30 hover:border-[#7048e8]"}`}
            >
              <span className="text-2xl">{j.avatarEmoji}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span>{j.nomeExibicao}</span>
                  {j.selos.map((s: string) => <SeloV key={s} selo={s as Selo} tamanho={16} />)}
                  {j.cargo && <span className="rounded-md bg-[#5f3dc4] px-1.5 py-0.5 text-[10px]">{NOME_CARGO[j.cargo]}</span>}
                </div>
                <div className="text-xs text-[#b0a6e8]">
                  ID {j.idPublico} · Nv. {j.nivel} · <span className={j.estado === "ativo" ? "text-[#7be04a]" : "text-[#ff922b]"}>{String(j.estado).toUpperCase()}</span>
                </div>
              </div>
            </button>
          ))}
          {busca.trim() && resultado.data && resultado.data.length === 0 && <p className="text-sm text-[#b0a6e8]">Nenhum jogador com esse ID ou usuário.</p>}
        </div>
      </div>
      {selecionado && <FichaJogador key={selecionado} termo={selecionado} modo={modo} tem={tem} opcoes={opcoes} />}
    </div>
  );
}

export function FichaJogador({ termo, modo, tem, opcoes }: { termo: string; modo: Modo; tem: (p: string) => boolean; opcoes?: Opcoes }) {
  const ficha = trpc.staff109.ficha.useQuery({ termo }, { retry: false });
  const utils = trpc.useUtils();
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState(false);
  const [pend, setPend] = useState<Pendente>(null);
  const [motivo, setMotivo] = useState("");
  const [silencio, setSilencio] = useState<number>(opcoes?.silencio[0]?.min ?? 5);
  const [banir, setBanir] = useState<number>(opcoes?.banir[0]?.horas ?? 24);
  const [limparFrase, setLimparFrase] = useState(false);
  const [nota, setNota] = useState("");
  const ok = (m: string) => { setErro(false); setMsg(m); utils.staff109.ficha.invalidate(); utils.staff109.punidos.invalidate(); utils.admin.buscarJogador.invalidate(); };
  const falhou = (e: { message: string }) => { setErro(true); setMsg(e.message); };
  const mSilenciar = trpc.staff109.silenciar.useMutation({ onSuccess: (r) => { ok(`${r.jogador} ficou sem chat por ${r.tempo}.`); setMotivo(""); }, onError: falhou });
  const mBanir = trpc.staff109.banir.useMutation({ onSuccess: (r) => { ok(`${r.jogador} foi banido (${r.tempo}).`); setMotivo(""); }, onError: falhou });
  const mAdvertir = trpc.staff109.advertir.useMutation({ onSuccess: (r) => { ok(`${r.jogador} recebeu a advertência.`); setMotivo(""); }, onError: falhou });
  const mExpulsar = trpc.staff109.expulsar.useMutation({ onSuccess: (r) => ok(r.saiu ? `${r.jogador} saiu da sala.` : `${r.jogador} não está em nenhuma sala agora.`), onError: falhou });
  const mNome = trpc.staff109.trocarNome.useMutation({ onSuccess: (r) => { ok(`O nome "${r.antes}" virou ${r.depois}.`); setMotivo(""); }, onError: falhou });
  const mNota = trpc.staff109.anotar.useMutation({ onSuccess: () => { ok("Nota guardada."); setNota(""); }, onError: falhou });
  const mTirar = trpc.staff109.tirarPunicao.useMutation({ onSuccess: () => ok("Punição tirada."), onError: falhou });

  const j = ficha.data;
  if (ficha.error) return <div className="cartao-rua p-5"><Aviso msg={ficha.error.message} erro /></div>;
  if (!j) return <div className="cartao-rua p-5 text-sm text-[#b0a6e8]">Abrindo a ficha...</div>;
  const motivoOk = motivo.trim().length >= 3;
  const pede = (titulo: string, resumo: ReactNode, faz: () => void, perigoso = false) => setPend({ titulo, resumo, faz, perigoso });
  const moderar = j.podeAgir && (tem("silenciar") || tem("suspender") || tem("aplicar_punicoes") || tem("advertir") || tem("expulsar") || tem("trocar_nome"));
  const rotSil = opcoes?.silencio.find((o) => o.min === silencio)?.rotulo ?? `${silencio} min`;
  const rotBan = opcoes?.banir.find((o) => o.horas === banir)?.rotulo ?? `${banir} h`;

  return (
    <div className="cartao-rua p-5" data-testid="ficha-jogador">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-4xl">{j.avatarEmoji}</span>
        <div className="min-w-0 flex-1">
          <h3 className="texto-pixo text-xl leading-none" data-testid="ficha-nome">{j.nome}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-[#b0a6e8]">
            <span>ID {j.idPublico} · @{j.username}</span>
            {j.selos.map((s: string) => <SeloV key={s} selo={s as Selo} tamanho={16} />)}
            {j.cargo && <span className="rounded-md bg-[#5f3dc4] px-1.5 py-0.5 text-[10px] text-white">{NOME_CARGO[j.cargo]}</span>}
          </div>
        </div>
        <div className="text-right text-xs">
          <div data-testid="ficha-estado" className={j.estado === "ativo" ? "text-[#7be04a]" : "text-[#ff922b]"}>
            {j.estado === "banido" ? "BANIDO PARA SEMPRE" : j.estado === "suspenso" && j.suspensoAte && new Date(j.suspensoAte).getTime() > Date.now() ? `BANIDO · falta ${falta(j.suspensoAte)}` : "CONTA ATIVA"}
          </div>
          {j.silencio && <div data-testid="ficha-silencio" className="mt-0.5 text-[#ffd23f]">🔇 SEM CHAT · falta {falta(j.silencio.ate)}</div>}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[#b0a6e8] sm:grid-cols-4">
        <div>Nível <b className="text-white">{j.nivel}</b> · {j.titulo}</div>
        <div>Patente <b className="text-white">{j.patente.titulo}</b> ({j.patente.pts} pts)</div>
        <div>Partidas <b className="text-white">{j.stats?.partidas ?? 0}</b></div>
        <div>Criada <b className="text-white">{quando(j.criadoEm)}</b></div>
        {j.bio && <div className="col-span-2 sm:col-span-4">Frase do perfil: “{j.bio}”</div>}
      </div>
      <Aviso msg={msg} erro={erro} />
      {!j.podeAgir && <p className="mt-3 text-xs text-[#6f6699]">Você não pode agir nesta conta (a sua, a do Dono ou de um cargo igual ou maior que o seu).</p>}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {/* ---------- MODERAR ---------- */}
        {moderar && (
          <div className="rounded-xl border-2 border-[#33286b] bg-black/30 p-4 md:col-span-2" data-testid="moderar">
            <h4 className="texto-pixo">MODERAR</h4>
            <input data-testid="motivo-moderacao" className="input-racha mt-2" placeholder="Motivo (obrigatório: o jogador vê)" value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={300} />
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {tem("silenciar") && (opcoes?.silencio.length ?? 0) > 0 && (
                <div className="flex gap-2">
                  <select data-testid="sel-silencio" className="input-racha" value={silencio} onChange={(e) => setSilencio(Number(e.target.value))}>
                    {opcoes!.silencio.map((o) => <option key={o.min} value={o.min}>{o.rotulo}</option>)}
                  </select>
                  <button data-testid="acao-silenciar" className="botao-racha botao-amarelo flex-none px-3 py-1.5 text-xs" disabled={!motivoOk}
                    onClick={() => pede("SILENCIAR O CHAT", <>Calar o chat de <b>{j.nome}</b> por <b>{rotSil}</b>? Ele não manda nada em nenhum chat nem nas falas da partida. Motivo: {motivo}</>, () => mSilenciar.mutate({ termo: j.idPublico, minutos: silencio, motivo, confirmacao: true }))}>
                    🔇 SILENCIAR
                  </button>
                </div>
              )}
              {(opcoes?.banir.length ?? 0) > 0 && (
                <div className="flex gap-2">
                  <select data-testid="sel-banir" className="input-racha" value={banir} onChange={(e) => setBanir(Number(e.target.value))}>
                    {opcoes!.banir.map((o) => <option key={o.horas} value={o.horas}>{o.rotulo}</option>)}
                  </select>
                  <button data-testid="acao-banir" className="botao-racha botao-fantasma flex-none px-3 py-1.5 text-xs text-[#f783ac]" disabled={!motivoOk}
                    onClick={() => pede("BANIR", <>Banir <b>{j.nome}</b> <b>{banir === 0 ? "PARA SEMPRE" : `por ${rotBan}`}</b>? Ele sai das salas na hora e não entra no jogo{banir === 0 ? "" : " até lá"}. Motivo: {motivo}</>, () => mBanir.mutate({ termo: j.idPublico, horas: banir, motivo, confirmacao: true }), true)}>
                    🚫 BANIR
                  </button>
                </div>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tem("advertir") && (
                <button data-testid="acao-advertir" className="botao-racha botao-fantasma px-2.5 py-1 text-xs" disabled={!motivoOk}
                  onClick={() => pede("ADVERTIR", <>Mandar uma advertência para <b>{j.nome}</b>? Ele recebe na central de mensagens. Motivo: {motivo}</>, () => mAdvertir.mutate({ termo: j.idPublico, motivo, confirmacao: true }))}>
                  ⚠️ ADVERTIR
                </button>
              )}
              {tem("expulsar") && (
                <button data-testid="acao-expulsar" className="botao-racha botao-fantasma px-2.5 py-1 text-xs" disabled={!motivoOk}
                  onClick={() => pede("TIRAR DA SALA", <>Tirar <b>{j.nome}</b> da sala/partida em que ele está agora? Ele não volta para essa sala por 10 min. Motivo: {motivo}</>, () => mExpulsar.mutate({ termo: j.idPublico, motivo, confirmacao: true }))}>
                  🚪 TIRAR DA SALA
                </button>
              )}
              {tem("trocar_nome") && (
                <>
                  <button data-testid="acao-trocar-nome" className="botao-racha botao-fantasma px-2.5 py-1 text-xs" disabled={!motivoOk}
                    onClick={() => pede("TROCAR O NOME", <>Trocar o nome <b>{j.nome}</b> por <b>Jogador{j.idPublico}</b>{limparFrase ? " e apagar a frase do perfil" : ""}? Ele escolhe outro no perfil. Motivo: {motivo}</>, () => mNome.mutate({ termo: j.idPublico, motivo, limparFrase, confirmacao: true }))}>
                    ✏️ TROCAR O NOME
                  </button>
                  <label className="flex items-center gap-1 text-xs text-[#b0a6e8]"><input type="checkbox" checked={limparFrase} onChange={(e) => setLimparFrase(e.target.checked)} /> e a frase do perfil</label>
                </>
              )}
            </div>
            <p className="mt-2 text-[11px] text-[#6f6699]">Tudo o que você faz aqui fica registrado{modo === "staff" ? " para o Dono" : ""}.</p>
          </div>
        )}

        {/* ---------- PUNIÇÕES ---------- */}
        <div className="rounded-xl border-2 border-[#33286b] bg-black/30 p-4" data-testid="lista-punicoes">
          <h4 className="texto-pixo">PUNIÇÕES ({j.punicoes.length})</h4>
          <div className="mt-2 max-h-56 space-y-1 overflow-y-auto">
            {!j.punicoes.length && <p className="text-xs text-[#b0a6e8]">Ficha limpa.</p>}
            {j.punicoes.map((p) => (
              <div key={p.id} className={`rounded-lg border px-2 py-1 text-xs ${p.valendo ? "border-[#e03131]/50 bg-[#e03131]/10" : "border-[#33286b] bg-black/20 text-[#8d84b8]"}`}>
                <div className="flex items-center gap-2">
                  <span className="flex-1"><b>{TIPO_PUNICAO[p.tipo] ?? p.tipo}</b>{p.valendo && p.expiraEm ? ` · falta ${falta(p.expiraEm)}` : ""}{p.tirada ? " · tirada" : ""}</span>
                  {p.podeTirar && (
                    <button data-testid={"tirar-" + p.id} className="text-[#7be04a] underline"
                      onClick={() => pede("TIRAR A PUNIÇÃO", <>Tirar {TIPO_PUNICAO[p.tipo] ?? p.tipo} de <b>{j.nome}</b>?</>, () => mTirar.mutate({ punicaoId: p.id, confirmacao: true }))}>
                      tirar
                    </button>
                  )}
                </div>
                <div className="text-[#b0a6e8]">{p.motivo} — {p.por}, {quando(p.criadaEm)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ---------- DENÚNCIAS CONTRA ---------- */}
        <div className="rounded-xl border-2 border-[#33286b] bg-black/30 p-4">
          <h4 className="texto-pixo">DENÚNCIAS CONTRA ({j.denuncias.length})</h4>
          <div className="mt-2 max-h-56 space-y-1 overflow-y-auto text-xs">
            {!j.denuncias.length && <p className="text-[#b0a6e8]">Nenhuma.</p>}
            {j.denuncias.map((d) => (
              <div key={d.id} className="rounded-lg border border-[#33286b] bg-black/20 px-2 py-1">
                <b>{d.motivo}</b> · {d.estado.replace("_", " ")} · {quando(d.criadaEm)}{d.canal ? ` · chat ${d.canal}` : ""}
                {d.detalhes && <div className="text-[#b0a6e8]">“{d.detalhes}”</div>}
              </div>
            ))}
          </div>
        </div>

        {/* ---------- NOTAS DA EQUIPE ---------- */}
        {j.veNotas && (
          <div className="rounded-xl border-2 border-[#33286b] bg-black/30 p-4">
            <h4 className="texto-pixo">NOTAS DA EQUIPE</h4>
            {tem("anotar") && (
              <div className="mt-2 flex gap-2">
                <input data-testid="nota-texto" className="input-racha" placeholder="Ex.: avisado no chat, reincidente" value={nota} onChange={(e) => setNota(e.target.value)} maxLength={500} />
                <button data-testid="acao-anotar" className="botao-racha botao-roxo flex-none px-3 py-1.5 text-xs" disabled={nota.trim().length < 3} onClick={() => mNota.mutate({ termo: j.idPublico, texto: nota })}>ANOTAR</button>
              </div>
            )}
            <div className="mt-2 max-h-44 space-y-1 overflow-y-auto text-xs">
              {!j.notas.length && <p className="text-[#b0a6e8]">Sem notas.</p>}
              {j.notas.map((n) => <div key={n.id} className="rounded-lg border border-[#33286b] bg-black/20 px-2 py-1">{n.texto} <span className="text-[#6f6699]">— {n.por}, {quando(n.criadaEm)}</span></div>)}
            </div>
          </div>
        )}

        {/* ---------- SÓ NO PAINEL DO DONO ---------- */}
        {modo === "dono" && <PartesDoDono termo={j.idPublico} nome={j.nome} selos={j.selos} patente={j.patente} tem={tem} pede={pede} avisa={(m, e) => { setErro(!!e); setMsg(m); }} />}
        {modo === "staff" && tem("aplicar_punicoes") && j.podeAgir && j.patente.pts > 0 && (
          <PatenteStaff termo={j.idPublico} nome={j.nome} pts={j.patente.pts} pede={pede} avisa={(m, e) => { setErro(!!e); setMsg(m); }} />
        )}
      </div>

      {pend && (
        <Confirmar titulo={pend.titulo} perigoso={pend.perigoso} aoCancelar={() => setPend(null)} aoConfirmar={() => { pend.faz(); setPend(null); }}>
          {pend.resumo}
        </Confirmar>
      )}
    </div>
  );
}

type Pede = (titulo: string, resumo: ReactNode, faz: () => void, perigoso?: boolean) => void;

// a staff (Administrador) só tira pontos da patente: zerar quem trapaceou
function PatenteStaff({ termo, nome, pts, pede, avisa }: { termo: string; nome: string; pts: number; pede: Pede; avisa: (m: string, erro?: boolean) => void }) {
  const utils = trpc.useUtils();
  const [motivo, setMotivo] = useState("");
  const m = trpc.admin.ajustarPatente.useMutation({ onSuccess: (r) => { avisa(`Patente de ${r.jogador}: ${r.antes} → ${r.depois} pontos.`); utils.staff109.ficha.invalidate(); }, onError: (e) => avisa(e.message, true) });
  return (
    <div className="rounded-xl border-2 border-[#33286b] bg-black/30 p-4">
      <h4 className="texto-pixo">PATENTE (TRAPAÇA)</h4>
      <p className="mt-1 text-xs text-[#b0a6e8]">Agora: {pts} pontos. A staff só zera (quem trapaceou na ranqueada).</p>
      <input className="input-racha mt-2" placeholder="Motivo (obrigatório)" value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={300} />
      <button className="botao-racha botao-amarelo mt-2 px-2.5 py-1 text-xs" disabled={motivo.trim().length < 3}
        onClick={() => pede("ZERAR A PATENTE", <>Zerar a patente de <b>{nome}</b> (era {pts} pontos)? Motivo: {motivo}</>, () => m.mutate({ termo, pts: 0, motivo, confirmacao: true }), true)}>
        ZERAR A PATENTE
      </button>
    </div>
  );
}

// os selos (verificado...), a carteira (moedas e gemas), os itens e a patente: só o Dono
function PartesDoDono({ termo, nome, selos, patente, tem, pede, avisa }: {
  termo: string; nome: string; selos: string[]; patente: { pts: number; titulo: string }; tem: (p: string) => boolean; pede: Pede; avisa: (m: string, erro?: boolean) => void;
}) {
  const utils = trpc.useUtils();
  const carteira = trpc.dono109.carteira.useQuery({ termo }, { enabled: tem("dar_moedas") });
  const inventario = trpc.admin.inventarioDoJogador.useQuery({ termo }, { enabled: tem("enviar_itens") });
  const recarrega = () => { utils.staff109.ficha.invalidate(); utils.dono109.carteira.invalidate(); utils.admin.inventarioDoJogador.invalidate(); utils.admin.buscarJogador.invalidate(); };
  const falhou = (e: { message: string }) => avisa(e.message, true);
  const mSelo = trpc.admin.gerenciarSelo.useMutation({ onSuccess: () => { avisa("Selo atualizado."); recarrega(); }, onError: falhou });
  const mCarteira = trpc.dono109.ajustarCarteira.useMutation({ onSuccess: (r) => { avisa(`Carteira de ${r.jogador}: ${r.moedas} moedas e ${r.gemas} gemas.`); recarrega(); setMoedas(0); setGemas(0); }, onError: falhou });
  const mItem = trpc.admin.concederItem.useMutation({ onSuccess: (r) => { avisa(r.resultado === "ja_possuia" ? `${r.jogador} já tinha ${r.item}.` : `${r.item} entregue para ${r.jogador}.`); recarrega(); }, onError: falhou });
  const mTiraItem = trpc.admin.revogarItem.useMutation({ onSuccess: () => { avisa("Item tirado."); recarrega(); }, onError: falhou });
  const mPatente = trpc.admin.ajustarPatente.useMutation({ onSuccess: (r) => { avisa(`Patente de ${r.jogador}: ${r.antes} → ${r.depois} pontos (${r.patente}).`); recarrega(); }, onError: falhou });
  const [moedas, setMoedas] = useState(0);
  const [gemas, setGemas] = useState(0);
  const [motivoC, setMotivoC] = useState("");
  const [avisar, setAvisar] = useState(true);
  const [item, setItem] = useState(CATALOGO_ITENS[0]?.codigo ?? "");
  const [pts, setPts] = useState(patente.pts);
  const [motivoP, setMotivoP] = useState("");
  const descreve = (n: number, nomeU: string) => (n > 0 ? `dar ${n} ${nomeU}` : `tirar ${-n} ${nomeU}`);

  return (
    <>
      {tem("gerenciar_selos") && (
        <div className="rounded-xl border-2 border-[#ffd23f]/40 bg-black/30 p-4" data-testid="selos-dono">
          <h4 className="texto-pixo">SELOS (VERIFICADO)</h4>
          <div className="mt-2 space-y-1.5">
            {(Object.keys(SELO_INFO) as Selo[]).filter((s) => s !== "criador").map((s) => {
              const tem2 = selos.includes(s);
              return (
                <div key={s} className="flex items-center gap-2 rounded-lg border border-[#33286b] bg-black/30 px-2 py-1.5 text-sm">
                  <SeloV selo={s} tamanho={20} />
                  <span className="flex-1">{SELO_INFO[s].nome}</span>
                  <button data-testid={"selo-" + s} className={`botao-racha px-2 py-0.5 text-xs ${tem2 ? "botao-fantasma text-[#f783ac]" : "botao-verde"}`}
                    onClick={() => pede(tem2 ? "TIRAR O SELO" : "DAR O SELO", <>{tem2 ? "Tirar" : "Dar"} o selo <b>{SELO_INFO[s].nome}</b> {tem2 ? "de" : "para"} <b>{nome}</b>?</>, () => mSelo.mutate({ termo, selo: s, acao: tem2 ? "remover" : "conceder", confirmacao: true }))}>
                    {tem2 ? "TIRAR" : "DAR"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tem("dar_moedas") && (
        <div className="rounded-xl border-2 border-[#ffd23f]/40 bg-black/30 p-4" data-testid="carteira-dono">
          <h4 className="texto-pixo">CARTEIRA</h4>
          <div className="mt-1 text-xs text-[#b0a6e8]" data-testid="carteira-saldo">
            Agora: <b className="text-white">{carteira.data ? carteira.data.moedas : "…"}</b> moedas · <b className="text-white">{carteira.data ? carteira.data.gemas : "…"}</b> gemas
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <label className="text-[11px] text-[#b0a6e8]">Moedas (− tira)
              <input data-testid="carteira-moedas" className="input-racha mt-0.5" type="number" value={moedas} onChange={(e) => setMoedas(Math.trunc(Number(e.target.value) || 0))} />
            </label>
            <label className="text-[11px] text-[#b0a6e8]">Gemas (− tira)
              <input data-testid="carteira-gemas" className="input-racha mt-0.5" type="number" value={gemas} onChange={(e) => setGemas(Math.trunc(Number(e.target.value) || 0))} />
            </label>
          </div>
          <input data-testid="carteira-motivo" className="input-racha mt-2" placeholder="Motivo (fica no histórico da carteira)" value={motivoC} onChange={(e) => setMotivoC(e.target.value)} maxLength={300} />
          <label className="mt-1 flex items-center gap-1 text-xs text-[#b0a6e8]"><input type="checkbox" checked={avisar} onChange={(e) => setAvisar(e.target.checked)} /> avisar o jogador (quando ele ganha)</label>
          <button data-testid="acao-carteira" className="botao-racha botao-verde mt-2 w-full px-3 py-1.5 text-xs" disabled={(!moedas && !gemas) || motivoC.trim().length < 3}
            onClick={() => pede("MEXER NA CARTEIRA", <>{[moedas ? descreve(moedas, "moedas") : "", gemas ? descreve(gemas, "gemas") : ""].filter(Boolean).join(" e ")} {moedas > 0 || gemas > 0 ? "para" : "de"} <b>{nome}</b>? Motivo: {motivoC}</>, () => mCarteira.mutate({ termo, moedas, gemas, motivo: motivoC, avisar, confirmacao: true }))}>
            APLICAR NA CARTEIRA
          </button>
        </div>
      )}

      {tem("enviar_itens") && (
        <div className="rounded-xl border-2 border-[#ffd23f]/40 bg-black/30 p-4">
          <h4 className="texto-pixo">ITENS ({inventario.data?.length ?? 0})</h4>
          <div className="mt-2 flex gap-2">
            <select className="input-racha" value={item} onChange={(e) => setItem(e.target.value)}>
              {CATALOGO_ITENS.map((i) => <option key={i.codigo} value={i.codigo}>{i.visual.emoji} {i.nome} · {i.categoria}</option>)}
            </select>
            <button className="botao-racha botao-verde flex-none px-3 py-1.5 text-xs"
              onClick={() => pede("DAR O ITEM", <>Dar <b>{CATALOGO_ITENS.find((i) => i.codigo === item)?.nome}</b> para <b>{nome}</b>?</>, () => mItem.mutate({ termo, codigoItem: item, confirmacao: true }))}>
              DAR
            </button>
          </div>
          <div className="mt-2 max-h-36 space-y-1 overflow-y-auto">
            {inventario.data?.map((i) => (
              <div key={i.codigo} className="flex items-center gap-2 rounded-lg border border-[#33286b] bg-black/30 px-2 py-1 text-xs">
                <span className="flex-1">{i.nome} <span className="text-[#6f6699]">({i.categoria})</span></span>
                <button className="text-[#f783ac] underline" onClick={() => pede("TIRAR O ITEM", <>Tirar <b>{i.nome}</b> de <b>{nome}</b>?</>, () => mTiraItem.mutate({ termo, codigoItem: i.codigo, confirmacao: true }))}>tirar</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tem("aplicar_punicoes") && (
        <div className="rounded-xl border-2 border-[#ffd23f]/40 bg-black/30 p-4">
          <h4 className="texto-pixo">PATENTE DA RANQUEADA</h4>
          <div className="mt-1 text-xs text-[#b0a6e8]">Agora: <b className="text-white">{patente.titulo}</b> · {patente.pts} pontos</div>
          <div className="mt-2 flex items-center gap-2 text-sm">
            <span className="text-xs text-[#b0a6e8]">Pontos:</span>
            <input className="input-racha w-24" type="number" min={0} max={99999} value={pts} onChange={(e) => setPts(Math.max(0, Number(e.target.value) || 0))} />
          </div>
          <input className="input-racha mt-2" placeholder="Motivo (obrigatório)" value={motivoP} onChange={(e) => setMotivoP(e.target.value)} maxLength={300} />
          <button className="botao-racha botao-amarelo mt-2 px-2.5 py-1 text-xs" disabled={motivoP.trim().length < 3}
            onClick={() => pede("AJUSTAR A PATENTE", <>Pôr a patente de <b>{nome}</b> em <b>{pts}</b> pontos (era {patente.pts})? Motivo: {motivoP}</>, () => mPatente.mutate({ termo, pts, motivo: motivoP, confirmacao: true }))}>
            AJUSTAR A PATENTE
          </button>
        </div>
      )}
    </>
  );
}

// ============================================================================
// OS PUNIDOS (o que está valendo agora)
// ============================================================================
export function AbaPunidos(_props: { tem?: (p: string) => boolean }) {   // (quem pode tirar cada uma vem do servidor: podeTirar)
  const [tipo, setTipo] = useState<"todos" | "silencio" | "banimento">("todos");
  const lista = trpc.staff109.punidos.useQuery({ tipo });
  const utils = trpc.useUtils();
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState(false);
  const [pend, setPend] = useState<Pendente>(null);
  const tirar = trpc.staff109.tirarPunicao.useMutation({
    onSuccess: (r) => { setErro(false); setMsg(`Punição tirada${r.jogador ? " de " + r.jogador : ""}.`); utils.staff109.punidos.invalidate(); },
    onError: (e) => { setErro(true); setMsg(e.message); },
  });
  return (
    <div className="cartao-rua p-5" data-testid="aba-punidos-conteudo">
      <h3 className="texto-pixo text-xl">PUNIDOS AGORA</h3>
      <div className="mt-3 flex gap-1">
        {([["todos", "TODOS"], ["silencio", "🔇 SEM CHAT"], ["banimento", "🚫 BANIDOS"]] as const).map(([t, r]) => (
          <button key={t} onClick={() => setTipo(t)} className={`flex-none rounded-xl px-3 py-1.5 text-xs transition ${tipo === t ? "bg-[#ffd23f] text-[#3a2000]" : "bg-black/30 text-[#b0a6e8]"}`}>{r}</button>
        ))}
      </div>
      <Aviso msg={msg} erro={erro} />
      <div className="mt-3 space-y-1.5">
        {lista.data && !lista.data.length && <p className="text-sm text-[#b0a6e8]">Ninguém punido agora.</p>}
        {lista.data?.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-[#33286b] bg-black/30 px-3 py-2 text-xs" data-testid={"punido-" + (p.jogador?.idPublico ?? p.id)}>
            <span className="text-xl">{p.jogador?.avatarEmoji}</span>
            <div className="min-w-0 flex-1">
              <div><b>{p.jogador?.nome}</b> <span className="text-[#6f6699]">ID {p.jogador?.idPublico}</span> · {TIPO_PUNICAO[p.tipo] ?? p.tipo}{p.falta ? ` · falta ${p.falta}` : ""}</div>
              <div className="text-[#b0a6e8]">{p.motivo} — {p.por}, {quando(p.criadaEm)}</div>
            </div>
            {p.podeTirar && (
              <button className="botao-racha botao-fantasma px-2 py-0.5 text-xs text-[#7be04a]"
                onClick={() => setPend({ titulo: "TIRAR A PUNIÇÃO", resumo: <>Tirar {TIPO_PUNICAO[p.tipo] ?? p.tipo} de <b>{p.jogador?.nome}</b>?</>, faz: () => tirar.mutate({ punicaoId: p.id, confirmacao: true }) })}>
                TIRAR
              </button>
            )}
          </div>
        ))}
      </div>
      {pend && <Confirmar titulo={pend.titulo} aoCancelar={() => setPend(null)} aoConfirmar={() => { pend.faz(); setPend(null); }}>{pend.resumo}</Confirmar>}
    </div>
  );
}

// ============================================================================
// AS DENÚNCIAS (com o que foi dito e as ações direto delas)
// ============================================================================
export function AbaDenuncias({ tem, opcoes, abreFicha }: { tem: (p: string) => boolean; opcoes?: Opcoes; abreFicha?: (id: string) => void }) {
  const [estado, setEstado] = useState<"aberta" | "em_analise" | "resolvida" | "arquivada" | "todas">("aberta");
  const lista = trpc.staff109.denuncias.useQuery({ estado });
  const utils = trpc.useUtils();
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState(false);
  const [aberta, setAberta] = useState<number | null>(null);
  const [tempo, setTempo] = useState<number>(opcoes?.silencio.find((o) => o.min === 60)?.min ?? opcoes?.silencio[0]?.min ?? 5);
  const [pend, setPend] = useState<Pendente>(null);
  const ok = (m: string) => { setErro(false); setMsg(m); utils.staff109.denuncias.invalidate(); utils.staff109.punidos.invalidate(); };
  const falhou = (e: { message: string }) => { setErro(true); setMsg(e.message); };
  const mEstado = trpc.staff109.denunciaEstado.useMutation({ onSuccess: () => ok("Denúncia atualizada."), onError: falhou });
  const mSil = trpc.staff109.silenciar.useMutation({ onSuccess: (r) => ok(`${r.jogador} ficou sem chat por ${r.tempo}. A denúncia ficou resolvida.`), onError: falhou });
  const mAdv = trpc.staff109.advertir.useMutation({ onSuccess: (r) => ok(`${r.jogador} recebeu a advertência. A denúncia ficou resolvida.`), onError: falhou });
  const rot = (min: number) => opcoes?.silencio.find((o) => o.min === min)?.rotulo ?? `${min} min`;
  return (
    <div className="cartao-rua p-5" data-testid="aba-denuncias-conteudo">
      <h3 className="texto-pixo text-xl">DENÚNCIAS</h3>
      <div className="mt-3 flex gap-1 overflow-x-auto">
        {(["aberta", "em_analise", "resolvida", "arquivada", "todas"] as const).map((e) => (
          <button key={e} onClick={() => setEstado(e)} className={`flex-none rounded-xl px-3 py-1.5 text-xs transition ${estado === e ? "bg-[#ffd23f] text-[#3a2000]" : "bg-black/30 text-[#b0a6e8]"}`}>
            {e.replace("_", " ").toUpperCase()}
          </button>
        ))}
      </div>
      <Aviso msg={msg} erro={erro} />
      <div className="mt-3 space-y-2">
        {lista.data && !lista.data.length && <p className="text-sm text-[#b0a6e8]">Nada por aqui. Quadra limpa! ✨</p>}
        {lista.data?.map((d) => {
          const motivo = `Denúncia: ${d.motivoTexto}${d.detalhes ? " — " + d.detalhes.slice(0, 120) : ""}`.slice(0, 300);
          return (
            <div key={d.id} className="rounded-xl border-2 border-[#33286b] bg-black/30 p-3" data-testid={"denuncia-" + d.id}>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-md bg-[#e03131]/20 px-2 py-0.5 text-xs text-[#ffb4a8]">{d.motivoTexto}</span>
                <span><b>{d.autor?.nome}</b> denunciou <b>{d.alvo?.nome}</b> <span className="text-[#6f6699]">({d.alvo?.idPublico})</span></span>
                <span className="flex-1" />
                <span className="text-[10px] text-[#6f6699]">{quando(d.criadaEm)}{d.canal ? ` · chat ${d.canal}` : ` · ${d.origem}`}{d.responsavel ? ` · com ${d.responsavel}` : ""}</span>
              </div>
              {d.detalhes && <div className="mt-1 rounded-lg bg-black/30 px-2 py-1 text-xs text-[#d8d2f5]">“{d.detalhes}”</div>}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {abreFicha && d.alvo && <button className="botao-racha botao-fantasma px-2.5 py-1 text-xs" onClick={() => abreFicha(d.alvo!.idPublico)}>ABRIR A FICHA</button>}
                {d.estado === "aberta" && <button className="botao-racha botao-fantasma px-2.5 py-1 text-xs" onClick={() => mEstado.mutate({ id: d.id, estado: "em_analise" })}>ASSUMIR</button>}
                {d.estado !== "resolvida" && d.alvo && tem("silenciar") && (opcoes?.silencio.length ?? 0) > 0 && (
                  <button data-testid={"den-silenciar-" + d.id} className="botao-racha botao-amarelo px-2.5 py-1 text-xs" onClick={() => setAberta(aberta === d.id ? null : d.id)}>🔇 SILENCIAR</button>
                )}
                {d.estado !== "resolvida" && d.alvo && tem("advertir") && (
                  <button className="botao-racha botao-fantasma px-2.5 py-1 text-xs"
                    onClick={() => setPend({ titulo: "ADVERTIR", resumo: <>Advertir <b>{d.alvo!.nome}</b>? Motivo: {motivo}</>, faz: () => mAdv.mutate({ termo: d.alvo!.idPublico, motivo, denunciaId: d.id, confirmacao: true }) })}>
                    ⚠️ ADVERTIR
                  </button>
                )}
                {d.estado !== "resolvida" && <button className="botao-racha botao-verde px-2.5 py-1 text-xs" onClick={() => mEstado.mutate({ id: d.id, estado: "resolvida" })}>RESOLVIDA</button>}
                {d.estado !== "arquivada" && <button className="botao-racha botao-fantasma px-2.5 py-1 text-xs" onClick={() => mEstado.mutate({ id: d.id, estado: "arquivada" })}>ARQUIVAR</button>}
              </div>
              {aberta === d.id && d.alvo && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <select data-testid={"den-tempo-" + d.id} className="input-racha w-auto" value={tempo} onChange={(e) => setTempo(Number(e.target.value))}>
                    {opcoes!.silencio.map((o) => <option key={o.min} value={o.min}>{o.rotulo}</option>)}
                  </select>
                  <button data-testid={"den-silenciar-ok-" + d.id} className="botao-racha botao-amarelo px-3 py-1 text-xs"
                    onClick={() => setPend({ titulo: "SILENCIAR O CHAT", resumo: <>Calar o chat de <b>{d.alvo!.nome}</b> por <b>{rot(tempo)}</b>? Motivo: {motivo}</>, faz: () => { mSil.mutate({ termo: d.alvo!.idPublico, minutos: tempo, motivo, denunciaId: d.id, confirmacao: true }); setAberta(null); } })}>
                    SILENCIAR POR {rot(tempo).toUpperCase()}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {pend && <Confirmar titulo={pend.titulo} aoCancelar={() => setPend(null)} aoConfirmar={() => { pend.faz(); setPend(null); }}>{pend.resumo}</Confirmar>}
    </div>
  );
}

// ============================================================================
// MEUS REGISTROS (só o que eu fiz)
// ============================================================================
export function AbaMeusRegistros() {
  const lista = trpc.staff109.meusRegistros.useQuery({ limite: 100 });
  return (
    <div className="cartao-rua p-5" data-testid="aba-meus-registros-conteudo">
      <h3 className="texto-pixo text-xl">MEUS REGISTROS</h3>
      <p className="mt-1 text-xs text-[#6f6699]">O que você fez no painel. O Dono vê tudo o que a equipe faz.</p>
      <div className="mt-3 space-y-1">
        {lista.data && !lista.data.length && <p className="text-sm text-[#b0a6e8]">Nada ainda.</p>}
        {lista.data?.map((r) => (
          <div key={r.id} className="flex flex-wrap gap-2 rounded-lg border border-[#241b56] bg-black/20 px-2 py-1.5 text-xs">
            <span className="w-28 flex-none text-[#6f6699]">{quando(r.quando)}</span>
            <span className={r.resultado === "ok" ? "" : "text-[#ffb4a8]"}>{ROTULO_ACAO[r.acao] ?? r.acao}{r.resultado !== "ok" ? ` (${r.resultado})` : ""}</span>
            {r.alvo && <span className="text-[#b0a6e8]">· {r.alvo.nome} ({r.alvo.idPublico})</span>}
            <span className="min-w-0 flex-1 text-[#8d84b8]">{resumoDetalhes(r.detalhes)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
