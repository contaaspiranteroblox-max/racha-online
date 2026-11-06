// ============================================================================
// RACHA v109 — RACHA CONTROL › O PAINEL DO DONO: tudo. A visão geral (o que a staff fez), os jogadores (a moderação e o que só
// o Dono faz: dar/tirar o verificado e os outros selos, moedas e gemas, itens e a patente), a STAFF (dar e tirar cargo,
// ajustar permissões, resetar o 2FA, encerrar as sessões do painel), os REGISTROS de tudo com filtro, as denúncias, os
// punidos, os presentes (itens e correio), os eventos e as contas.
// ============================================================================
import { useMemo, useState } from "react";
import { trpc } from "@/providers/trpc";
import { CATALOGO_ITENS, PERMISSOES_PADRAO, type Cargo } from "@contracts/racha";
import { AbaEventos, AbaCorreio } from "./AdminV88";
import { AbaContas } from "./AdminContas";
import {
  Abas, AbaDenuncias, AbaPunidos, Aviso, BuscaJogador, COR_PAINEL, Confirmar, MiniStat, NOME_CARGO, ROTULO_ACAO, quando, resumoDetalhes, type Opcoes,
} from "./PainelComum";

type Usuario = { nome: string; username: string; avatarEmoji: string; idPublico?: string };

// os nomes das permissões (o ajuste fino da staff)
const NOME_PERM: Record<string, string> = {
  consultar_jogadores: "Ver jogadores", analisar_denuncias: "Cuidar de todas as denúncias", ver_denuncias_atribuidas: "Só as denúncias dele",
  advertir: "Advertir", silenciar: "Silenciar o chat", suspender: "Banir por um tempo", aplicar_punicoes: "Banir para sempre, tirar punições, zerar patente",
  expulsar: "Tirar da sala", trocar_nome: "Trocar nomes", anotar: "Notas da equipe", consultar_registros: "Ver os próprios registros",
};

export default function PainelDono({ permissoes, usuario, sair }: { permissoes: string[]; usuario: Usuario; sair: React.ReactNode }) {
  const tem = (p: string) => permissoes.includes(p);
  const dono01 = usuario.idPublico === "000001"; // (as contas são só da conta do Dono, a 000001 — o servidor confere de novo)
  const opcoes = trpc.staff109.opcoes.useQuery();
  const dash = trpc.admin.dashboard.useQuery();
  const abas = [
    { id: "geral", rotulo: "🏠 Visão geral" },
    { id: "jogadores", rotulo: "👥 Jogadores" },
    { id: "staff", rotulo: "🛡 Staff" },
    { id: "registros", rotulo: "📜 Registros" },
    { id: "denuncias", rotulo: "🚩 Denúncias" },
    { id: "punidos", rotulo: "⛔ Punidos" },
    { id: "presentes", rotulo: "🎁 Presentes" },
    { id: "eventos", rotulo: "📅 Eventos" },
    ...(dono01 ? [{ id: "contas", rotulo: "👤 Contas" }] : []),
  ];
  const [aba, setAba] = useState("geral");
  const [ficha, setFicha] = useState<string | undefined>(undefined);
  const [filtroOp, setFiltroOp] = useState<string | undefined>(undefined);
  const cor = COR_PAINEL.dono;
  const op = opcoes.data as Opcoes | undefined;
  const abreFicha = (id: string) => { setFicha(id); setAba("jogadores"); };
  const verRegistros = (id: string) => { setFiltroOp(id); setAba("registros"); };

  return (
    <div className="mx-auto max-w-4xl space-y-4" data-testid="painel-dono">
      <div className="cartao-rua flex flex-wrap items-center gap-3 p-4" style={{ borderColor: cor }}>
        <span className="text-3xl">{usuario.avatarEmoji}</span>
        <div className="min-w-0 flex-1">
          <div className="texto-pixo text-xl leading-none" style={{ color: cor }}>PAINEL DO DONO</div>
          <div className="mt-1 text-xs text-[#b0a6e8]">{usuario.nome} · <span style={{ color: cor }}>👑 Dono</span></div>
        </div>
        {dash.data && (
          <div className="flex gap-3 text-center text-xs">
            <MiniStat n={dash.data.jogadores} r="JOGADORES" />
            <MiniStat n={dash.data.novosHoje} r="NOVOS HOJE" />
            <MiniStat n={dash.data.denunciasAbertas} r="DENÚNCIAS" />
            <MiniStat n={dash.data.selosConcedidos} r="SELOS" />
          </div>
        )}
        {sair}
      </div>
      <Abas abas={abas} aba={aba} setAba={(a) => { if (a !== "registros") setFiltroOp(undefined); setAba(a); }} cor={cor} />
      {!op && <div className="cartao-rua p-5 text-sm text-[#b0a6e8]">Abrindo...</div>}
      {op && aba === "geral" && <AbaVisaoGeral verRegistros={verRegistros} />}
      {op && aba === "jogadores" && <BuscaJogador key={ficha ?? "busca"} modo="dono" tem={tem} opcoes={op} inicial={ficha} />}
      {op && aba === "staff" && <AbaStaff verRegistros={verRegistros} />}
      {op && aba === "registros" && <AbaRegistrosDono key={filtroOp ?? "todos"} operadorInicial={filtroOp} abreFicha={abreFicha} />}
      {op && aba === "denuncias" && <AbaDenuncias tem={tem} opcoes={op} abreFicha={abreFicha} />}
      {op && aba === "punidos" && <AbaPunidos tem={tem} />}
      {op && aba === "presentes" && (
        <div className="space-y-4">
          <AbaRecompensas tem={tem} />
          <AbaCorreio tem={tem} />
        </div>
      )}
      {op && aba === "eventos" && <AbaEventos />}
      {op && aba === "contas" && dono01 && <AbaContas />}
    </div>
  );
}

// ============================================================================
// A VISÃO GERAL: o que a staff fez nos últimos 7 dias e as últimas ações
// ============================================================================
function AbaVisaoGeral({ verRegistros }: { verRegistros: (id: string) => void }) {
  const resumo = trpc.dono109.resumoStaff.useQuery({ dias: 7 });
  const ultimas = trpc.dono109.registros.useQuery({ soStaff: true, semConsultas: true, dias: 30, limite: 15, resultado: "todos" });
  return (
    <div className="space-y-4" data-testid="visao-geral">
      <div className="cartao-rua p-5">
        <h3 className="texto-pixo text-xl">A STAFF NOS ÚLTIMOS 7 DIAS</h3>
        {resumo.data && !resumo.data.pessoas.length && <p className="mt-2 text-sm text-[#b0a6e8]">Ninguém na staff ainda. Adicione na aba 🛡 Staff.</p>}
        <div className="mt-3 overflow-x-auto">
          {!!resumo.data?.pessoas.length && (
            <table className="w-full text-left text-xs" data-testid="resumo-staff">
              <thead>
                <tr className="border-b-2 border-[#33286b] text-[#b0a6e8]">
                  <th className="px-2 py-2">QUEM</th><th className="px-2 py-2">🔇</th><th className="px-2 py-2">🚫</th><th className="px-2 py-2">⚠️</th>
                  <th className="px-2 py-2">🚪</th><th className="px-2 py-2">✏️</th><th className="px-2 py-2">🚩</th><th className="px-2 py-2">NEGADAS</th><th className="px-2 py-2">ÚLTIMA AÇÃO</th>
                </tr>
              </thead>
              <tbody>
                {resumo.data.pessoas.map((p) => (
                  <tr key={p.usuarioId} className="border-b border-[#241b56]">
                    <td className="px-2 py-1.5"><button className="underline" onClick={() => p.idPublico && verRegistros(p.idPublico)}>{p.nome}</button> <span className="text-[#6f6699]">{p.nomeCargo}</span></td>
                    <td className="px-2 py-1.5">{p.silenciou}</td><td className="px-2 py-1.5">{p.baniu}</td><td className="px-2 py-1.5">{p.advertiu}</td>
                    <td className="px-2 py-1.5">{p.tirouDaSala}</td><td className="px-2 py-1.5">{p.trocouNome}</td><td className="px-2 py-1.5">{p.denuncias}</td>
                    <td className={`px-2 py-1.5 ${p.negadas ? "text-[#ffb4a8]" : ""}`}>{p.negadas}</td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-[#6f6699]">{quando(p.ultimaAcao)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <p className="mt-2 text-[11px] text-[#6f6699]">🔇 silenciou · 🚫 baniu · ⚠️ advertiu · 🚪 tirou da sala · ✏️ trocou o nome · 🚩 cuidou de denúncia · NEGADAS: tentou o que o cargo não pode.</p>
      </div>
      <div className="cartao-rua p-5">
        <h3 className="texto-pixo text-xl">AS ÚLTIMAS AÇÕES DA STAFF</h3>
        <ListaRegistros itens={ultimas.data?.itens ?? []} vazio="A staff ainda não fez nada." />
      </div>
    </div>
  );
}

type ItemRegistro = {
  id: number; acao: string; rotulo: string; resultado: string; detalhes: unknown; ip: string | null; quando: string | Date;
  operador: { nome: string; idPublico: string | null; nomeCargo: string }; alvo: { nome: string; idPublico: string } | null;
};
function ListaRegistros({ itens, vazio, abreFicha }: { itens: ItemRegistro[]; vazio: string; abreFicha?: (id: string) => void }) {
  if (!itens.length) return <p className="mt-2 text-sm text-[#b0a6e8]">{vazio}</p>;
  return (
    <div className="mt-3 space-y-1" data-testid="lista-registros">
      {itens.map((r) => (
        <div key={r.id} className={`flex flex-wrap gap-x-2 gap-y-0.5 rounded-lg border px-2 py-1.5 text-xs ${r.resultado === "ok" ? "border-[#241b56] bg-black/20" : "border-[#e03131]/40 bg-[#e03131]/10"}`}>
          <span className="w-28 flex-none text-[#6f6699]">{quando(r.quando)}</span>
          <span><b>{r.operador.nome}</b> <span className="text-[#6f6699]">({r.operador.nomeCargo})</span></span>
          <span className={r.resultado === "ok" ? "text-[#ffd23f]" : "text-[#ffb4a8]"}>{r.rotulo || ROTULO_ACAO[r.acao] || r.acao}{r.resultado !== "ok" ? ` — ${r.resultado.toUpperCase()}` : ""}</span>
          {r.alvo && (abreFicha ? <button className="text-[#b0a6e8] underline" onClick={() => abreFicha(r.alvo!.idPublico)}>{r.alvo.nome} ({r.alvo.idPublico})</button> : <span className="text-[#b0a6e8]">{r.alvo.nome} ({r.alvo.idPublico})</span>)}
          <span className="min-w-0 flex-1 text-[#8d84b8]">{resumoDetalhes(r.detalhes)}</span>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// OS REGISTROS (com filtro)
// ============================================================================
const ACOES_FILTRO: [string, string][] = [
  ["", "Todas as ações"], ["silenciar", "Silenciou o chat"], ["banir", "Baniu"], ["advertir", "Advertiu"], ["expulsar", "Tirou da sala"],
  ["trocar_nome", "Trocou o nome"], ["tirar_punicao", "Tirou punição"], ["denuncia", "Denúncias"], ["anotar", "Notas"], ["ver_ficha", "Olhou a ficha"],
  ["login_painel", "Entrou no painel"], ["2fa", "2FA"], ["carteira", "Carteira (Dono)"], ["conceder", "Deu item/selo (Dono)"],
];
function AbaRegistrosDono({ operadorInicial, abreFicha }: { operadorInicial?: string; abreFicha: (id: string) => void }) {
  const [operador, setOperador] = useState(operadorInicial ?? "");
  const [alvo, setAlvo] = useState("");
  const [acao, setAcao] = useState("");
  const [resultado, setResultado] = useState<"todos" | "ok" | "negado" | "erro">("todos");
  const [dias, setDias] = useState(30);
  const [soStaff, setSoStaff] = useState(true);
  const [semConsultas, setSemConsultas] = useState(true);
  const [paginas, setPaginas] = useState<number[]>([]);
  const filtro = { operador: operador.trim() || undefined, alvo: alvo.trim() || undefined, acao: acao || undefined, resultado, dias, soStaff, semConsultas: acao === "ver_ficha" ? false : semConsultas, limite: 80 };
  const primeira = trpc.dono109.registros.useQuery(filtro);
  return (
    <div className="cartao-rua p-5" data-testid="registros-dono">
      <h3 className="texto-pixo text-xl">REGISTROS</h3>
      <p className="mt-1 text-xs text-[#6f6699]">Tudo o que a equipe faz no painel (e cada tentativa negada), com quem, em quem e quando.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <input data-testid="filtro-operador" className="input-racha" placeholder="Quem fez (ID ou usuário)" value={operador} onChange={(e) => { setOperador(e.target.value); setPaginas([]); }} />
        <input data-testid="filtro-alvo" className="input-racha" placeholder="Em quem (ID ou usuário)" value={alvo} onChange={(e) => { setAlvo(e.target.value); setPaginas([]); }} />
        <select data-testid="filtro-acao" className="input-racha" value={acao} onChange={(e) => { setAcao(e.target.value); setPaginas([]); }}>
          {ACOES_FILTRO.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
        </select>
        <select className="input-racha" value={resultado} onChange={(e) => { setResultado(e.target.value as typeof resultado); setPaginas([]); }}>
          <option value="todos">Feitas e negadas</option><option value="ok">Só as feitas</option><option value="negado">Só as negadas</option><option value="erro">Só os erros</option>
        </select>
        <select className="input-racha" value={dias} onChange={(e) => { setDias(Number(e.target.value)); setPaginas([]); }}>
          <option value={1}>Hoje (24 h)</option><option value={7}>7 dias</option><option value={30}>30 dias</option><option value={90}>90 dias</option><option value={365}>1 ano</option>
        </select>
        <div className="flex flex-col justify-center gap-1 text-xs text-[#b0a6e8]">
          <label className="flex items-center gap-1"><input data-testid="filtro-so-staff" type="checkbox" checked={soStaff} onChange={(e) => { setSoStaff(e.target.checked); setPaginas([]); }} /> só a staff (sem as minhas)</label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={semConsultas} onChange={(e) => { setSemConsultas(e.target.checked); setPaginas([]); }} /> sem "olhou a ficha"</label>
        </div>
      </div>
      <ListaRegistros itens={(primeira.data?.itens ?? []) as ItemRegistro[]} vazio="Nenhum registro com esse filtro." abreFicha={abreFicha} />
      {paginas.map((antes) => <PaginaRegistros key={antes} filtro={filtro} antesDe={antes} abreFicha={abreFicha} mais={(id) => setPaginas((p) => (p.includes(id) ? p : [...p, id]))} ultima={paginas[paginas.length - 1] === antes} />)}
      {primeira.data && !primeira.data.fim && !paginas.length && (
        <button className="botao-racha botao-fantasma mt-3 px-3 py-1.5 text-xs" onClick={() => { const l = primeira.data!.itens; setPaginas([l[l.length - 1].id]); }}>MAIS ANTIGOS</button>
      )}
    </div>
  );
}
function PaginaRegistros({ filtro, antesDe, abreFicha, mais, ultima }: { filtro: Record<string, unknown>; antesDe: number; abreFicha: (id: string) => void; mais: (id: number) => void; ultima: boolean }) {
  const q = trpc.dono109.registros.useQuery({ ...(filtro as object), antesDe } as never);
  const d = q.data as { itens: ItemRegistro[]; fim: boolean } | undefined;
  return (
    <>
      <ListaRegistros itens={d?.itens ?? []} vazio="" abreFicha={abreFicha} />
      {ultima && d && !d.fim && d.itens.length > 0 && <button className="botao-racha botao-fantasma mt-3 px-3 py-1.5 text-xs" onClick={() => mais(d.itens[d.itens.length - 1].id)}>MAIS ANTIGOS</button>}
    </>
  );
}

// ============================================================================
// A STAFF: adicionar, mudar o cargo, as permissões, o 2FA, as sessões, o que cada um fez
// ============================================================================
function AbaStaff({ verRegistros }: { verRegistros: (id: string) => void }) {
  const equipe = trpc.dono109.equipe.useQuery();
  const utils = trpc.useUtils();
  const [termo, setTermo] = useState("");
  const [cargo, setCargo] = useState<"administrador" | "moderador" | "ajudante">("moderador");
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState(false);
  const [pend, setPend] = useState<null | { titulo: string; resumo: React.ReactNode; faz: () => void; perigoso?: boolean }>(null);
  const [aberto, setAberto] = useState<number | null>(null);
  const [senha, setSenha] = useState("");
  const ok = (m: string) => { setErro(false); setMsg(m); utils.dono109.equipe.invalidate(); };
  const falhou = (e: { message: string }) => { setErro(true); setMsg(e.message); };
  const mCargo = trpc.admin.definirCargo.useMutation({ onSuccess: (r) => { ok(`${r.jogador} agora é da staff. No primeiro login no painel ele configura o 2FA (o QR code).`); setTermo(""); }, onError: falhou });
  const mTira = trpc.admin.removerCargo.useMutation({ onSuccess: () => ok("Tirado da staff. As sessões do painel dele caíram."), onError: falhou });
  const mPerm = trpc.admin.definirPermissoes.useMutation({ onSuccess: () => ok("Permissões ajustadas."), onError: falhou });
  const m2fa = trpc.dono109.resetar2fa.useMutation({ onSuccess: (r) => { ok(`O 2FA de ${r.jogador} foi resetado: no próximo login aparece um QR code novo.`); setSenha(""); }, onError: falhou });
  const mSessoes = trpc.dono109.encerrarSessoes.useMutation({ onSuccess: (r) => ok(`As sessões do painel de ${r.jogador} caíram.`), onError: falhou });

  return (
    <div className="space-y-4" data-testid="aba-staff-conteudo">
      <div className="cartao-rua p-5">
        <h3 className="texto-pixo text-xl">COLOCAR NA STAFF</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <input data-testid="staff-termo" className="input-racha flex-1" placeholder="ID ou usuário do jogador" value={termo} onChange={(e) => setTermo(e.target.value)} />
          <select data-testid="staff-cargo" className="input-racha w-auto" value={cargo} onChange={(e) => setCargo(e.target.value as typeof cargo)}>
            <option value="ajudante">Ajudante</option>
            <option value="moderador">Moderador</option>
            <option value="administrador">Administrador</option>
          </select>
          <button data-testid="staff-adicionar" className="botao-racha botao-verde px-4 py-2 text-sm" disabled={!termo.trim()}
            onClick={() => setPend({ titulo: "COLOCAR NA STAFF", resumo: <>Dar o cargo de <b>{NOME_CARGO[cargo]}</b> para <b>{termo}</b>? Ele entra no painel da staff (com o 2FA) e não dá selo, presente, item, moeda nem gema.</>, faz: () => mCargo.mutate({ termo: termo.trim(), cargo, confirmacao: true }) })}>
            COLOCAR
          </button>
        </div>
        <Aviso msg={msg} erro={erro} />
      </div>

      <div className="cartao-rua p-5">
        <h3 className="texto-pixo text-xl">A EQUIPE</h3>
        <div className="mt-3 space-y-2">
          {equipe.data?.map((m) => {
            const j = m.jogador;
            const ehDono = m.cargo === "dono";
            return (
              <div key={m.usuarioId} className="rounded-xl border-2 border-[#33286b] bg-black/30 p-3" data-testid={"membro-" + (j?.idPublico ?? m.usuarioId)}>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-2xl">{j?.avatarEmoji}</span>
                  <div className="min-w-0 flex-1">
                    <div>{j?.nome} <span className="text-xs text-[#6f6699]">@{j?.username} · ID {j?.idPublico}</span></div>
                    <div className="text-xs text-[#b0a6e8]">
                      <span className={ehDono ? "text-[#ffd23f]" : "text-[#3bc9db]"}>{m.nomeCargo}</span>
                      {" · "}2FA {m.doisFatores === "ligado" ? "✔ ligado" : m.doisFatores === "esperando" ? "⏳ esperando o 1º login" : "— sem"}
                      {" · "}último login {quando(m.ultimoLogin)}{m.sessoesAbertas ? ` · ${m.sessoesAbertas} sessão(ões) aberta(s)` : ""}
                      {!ehDono && <> · {m.acoes7d} ações em 7 dias{m.negadas7d ? <span className="text-[#ffb4a8]"> · {m.negadas7d} negadas</span> : null}</>}
                    </div>
                  </div>
                  {j && <button className="botao-racha botao-fantasma px-2.5 py-1 text-xs" onClick={() => verRegistros(j.idPublico)}>O QUE FEZ</button>}
                  {j && <button data-testid={"membro-abre-" + j.idPublico} className="botao-racha botao-fantasma px-2.5 py-1 text-xs" onClick={() => setAberto(aberto === m.usuarioId ? null : m.usuarioId)}>{aberto === m.usuarioId ? "FECHAR" : "MEXER"}</button>}
                </div>
                {aberto === m.usuarioId && j && (
                  <div className="mt-3 space-y-3 border-t border-[#33286b] pt-3">
                    {!ehDono && (
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-[#b0a6e8]">Cargo:</span>
                        {(["ajudante", "moderador", "administrador"] as const).map((cg) => (
                          <button key={cg} disabled={cg === m.cargo} className={`botao-racha px-2.5 py-1 text-xs ${cg === m.cargo ? "botao-roxo" : "botao-fantasma"}`}
                            onClick={() => setPend({ titulo: "MUDAR O CARGO", resumo: <>Passar <b>{j.nome}</b> para <b>{NOME_CARGO[cg]}</b>? O 2FA dele recomeça (QR code novo no próximo login).</>, faz: () => mCargo.mutate({ termo: j.idPublico, cargo: cg, confirmacao: true }) })}>
                            {NOME_CARGO[cg]}
                          </button>
                        ))}
                      </div>
                    )}
                    {!ehDono && <Permissoes cargo={m.cargo as Cargo} atuais={m.permissoes} salvar={(lista) => setPend({ titulo: "AJUSTAR AS PERMISSÕES", resumo: <>Deixar <b>{j.nome}</b> só com: {lista.map((p) => NOME_PERM[p] ?? p).join(", ") || "nenhuma"}?</>, faz: () => mPerm.mutate({ termo: j.idPublico, permissoes: lista, confirmacao: true }) })} />}
                    <div className="flex flex-wrap items-center gap-2">
                      {ehDono && <input className="input-racha w-44" type="password" placeholder="Sua senha (o seu 2FA)" value={senha} onChange={(e) => setSenha(e.target.value)} />}
                      <button data-testid={"membro-2fa-" + j.idPublico} className="botao-racha botao-amarelo px-2.5 py-1 text-xs"
                        onClick={() => setPend({ titulo: "RESETAR O 2FA", resumo: <>Resetar o 2FA de <b>{j.nome}</b>? As sessões do painel {ehDono ? "(as suas também)" : "dele"} caem e, no próximo login, aparece um QR code novo para ler no app autenticador.</>, faz: () => m2fa.mutate({ termo: j.idPublico, senha: ehDono ? senha : undefined, confirmacao: true }), perigoso: true })}>
                        RESETAR O 2FA
                      </button>
                      {!ehDono && (
                        <button className="botao-racha botao-fantasma px-2.5 py-1 text-xs"
                          onClick={() => setPend({ titulo: "ENCERRAR AS SESSÕES", resumo: <>Derrubar agora as sessões do painel de <b>{j.nome}</b>? Ele precisa entrar de novo (com o 2FA).</>, faz: () => mSessoes.mutate({ termo: j.idPublico, confirmacao: true }) })}>
                          ENCERRAR AS SESSÕES
                        </button>
                      )}
                      {!ehDono && (
                        <button data-testid={"membro-tira-" + j.idPublico} className="botao-racha botao-fantasma px-2.5 py-1 text-xs text-[#f783ac]"
                          onClick={() => setPend({ titulo: "TIRAR DA STAFF", resumo: <>Tirar <b>{j.nome}</b> da staff? As sessões do painel dele caem na hora.</>, faz: () => mTira.mutate({ termo: j.idPublico, confirmacao: true }), perigoso: true })}>
                          TIRAR DA STAFF
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-[#6f6699]">A staff só modera. O ajuste das permissões só tira poderes do cargo — nunca dá o que é do Dono.</p>
      </div>
      {pend && <Confirmar titulo={pend.titulo} perigoso={pend.perigoso} aoCancelar={() => setPend(null)} aoConfirmar={() => { pend.faz(); setPend(null); }}>{pend.resumo}</Confirmar>}
    </div>
  );
}

function Permissoes({ cargo, atuais, salvar }: { cargo: Cargo; atuais: string[]; salvar: (l: string[]) => void }) {
  const todas = PERMISSOES_PADRAO[cargo] as string[];
  const [sel, setSel] = useState<string[]>(atuais);
  const mudou = useMemo(() => sel.slice().sort().join() !== atuais.slice().sort().join(), [sel, atuais]);
  return (
    <div className="text-xs">
      <div className="text-[#b0a6e8]">Permissões (o padrão do cargo; desmarque para tirar):</div>
      <div className="mt-1 grid gap-1 sm:grid-cols-2">
        {todas.map((p) => (
          <label key={p} className="flex items-center gap-1.5">
            <input type="checkbox" checked={sel.includes(p)} onChange={(e) => setSel((s) => (e.target.checked ? [...s, p] : s.filter((x) => x !== p)))} />
            {NOME_PERM[p] ?? p}
          </label>
        ))}
      </div>
      {mudou && <button className="botao-racha botao-verde mt-2 px-2.5 py-1 text-xs" onClick={() => salvar(sel)}>SALVAR AS PERMISSÕES</button>}
    </div>
  );
}

// ============================================================================
// OS PRESENTES: dar um item para um, para um grupo ou para todos (o correio fica embaixo)
// ============================================================================
function AbaRecompensas({ tem }: { tem: (p: string) => boolean }) {
  const [tipo, setTipo] = useState<"individual" | "grupo" | "global">("individual");
  const [item, setItem] = useState(CATALOGO_ITENS[0]?.codigo ?? "");
  const [lista, setLista] = useState("");
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState(false);
  const [confirmGlobal, setConfirmGlobal] = useState("");
  const [preview, setPreview] = useState(false);
  const chave = useMemo(() => `dist-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`, [tipo, item]);
  const historico = trpc.admin.historicoDistribuicoes.useQuery({ limite: 15 });
  const destinatarios = lista.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
  const previsao = trpc.admin.preVisualizarGrupo.useQuery({ destinatarios }, { enabled: preview && tipo !== "global" && destinatarios.length > 0 });
  const distribuir = trpc.admin.distribuir.useMutation({
    onSuccess: (r) => {
      setErro(false);
      setMsg(r.idempotent ? `A distribuição #${r.distribuicaoId} já tinha sido feita (nada duplicado).` : `Distribuição #${r.distribuicaoId}: ${r.entregues} entregues · ${r.jaPossuiam} já tinham · ${r.falhas} falhas.`);
      historico.refetch();
    },
    onError: (e) => { setErro(true); setMsg(e.message); },
  });
  const podeGlobal = tem("distribuir_global");
  const itemInfo = CATALOGO_ITENS.find((i) => i.codigo === item);
  return (
    <div className="cartao-rua p-5">
      <h3 className="texto-pixo text-xl">DAR UM ITEM DE PRESENTE</h3>
      <div className="mt-3 flex gap-1">
        {(["individual", "grupo", "global"] as const).map((t) => (
          <button key={t} onClick={() => { setTipo(t); setPreview(false); setMsg(""); }} className={`flex-1 rounded-xl px-3 py-1.5 text-sm transition ${tipo === t ? "bg-[#ffd23f] text-[#3a2000]" : "bg-black/30 text-[#b0a6e8]"}`}>
            {t === "individual" ? "UM JOGADOR" : t === "grupo" ? "UM GRUPO" : "TODO MUNDO"}
          </button>
        ))}
      </div>
      <select className="input-racha mt-3" value={item} onChange={(e) => setItem(e.target.value)}>
        {CATALOGO_ITENS.map((i) => <option key={i.codigo} value={i.codigo}>{i.visual.emoji} {i.nome} · {i.categoria}</option>)}
      </select>
      {tipo !== "global" && (
        <>
          <textarea className="input-racha mt-3 min-h-20" placeholder={tipo === "individual" ? "000123" : "000123\n000456\ncraque.da.quebrada"} value={lista} onChange={(e) => { setLista(e.target.value); setPreview(false); }} />
          {tipo === "grupo" && destinatarios.length > 0 && <button className="botao-racha botao-fantasma mt-2 px-3 py-1 text-xs" onClick={() => setPreview(true)}>CONFERIR {destinatarios.length} JOGADORES</button>}
          {preview && previsao.data && (
            <div className="mt-2 max-h-36 space-y-1 overflow-y-auto rounded-xl border-2 border-[#33286b] bg-black/30 p-2 text-xs">
              {previsao.data.map((p, i) => <div key={i} className={p.encontrado ? "text-[#7be04a]" : "text-[#f783ac]"}>{p.encontrado ? `✔ ${p.nome} (ID ${p.idPublico})` : `✘ "${p.termo}" não encontrado`}</div>)}
            </div>
          )}
        </>
      )}
      {tipo === "global" && (
        <div className="mt-3 rounded-xl border-2 border-[#ffd23f] bg-[#ffd23f]/10 p-3 text-sm">
          ⚠️ Vai para <b>todos os jogadores ativos</b>. Digite <b>DISTRIBUIR</b> para liberar:
          <input className="input-racha mt-1" value={confirmGlobal} onChange={(e) => setConfirmGlobal(e.target.value)} placeholder="DISTRIBUIR" disabled={!podeGlobal} />
        </div>
      )}
      <Aviso msg={msg} erro={erro} />
      <button className="botao-racha botao-verde mt-4 w-full px-4 py-3"
        disabled={distribuir.isPending || (tipo === "global" && (!podeGlobal || confirmGlobal !== "DISTRIBUIR")) || (tipo !== "global" && destinatarios.length === 0)}
        onClick={() => distribuir.mutate({ tipo, codigoItem: item, destinatarios: tipo === "global" ? undefined : destinatarios, chaveIdempotencia: chave, confirmacao: true, confirmacaoGlobal: tipo === "global" ? confirmGlobal : undefined })}>
        {distribuir.isPending ? "ENVIANDO..." : `DAR ${itemInfo?.nome?.toUpperCase() ?? "O ITEM"}${tipo === "global" ? " PARA TODOS" : ""}`}
      </button>
      <div className="mt-4 space-y-1.5">
        {historico.data?.map((d) => (
          <div key={d.id} className="flex items-center gap-3 rounded-xl border border-[#33286b] bg-black/30 px-3 py-2 text-xs">
            <span className="rounded-md bg-[#5f3dc4] px-2 py-0.5">{d.tipo.toUpperCase()}</span>
            <span className="flex-1">{d.item}</span>
            <span className="text-[#7be04a]">{d.entregues} ✔</span>
            <span className="text-[#b0a6e8]">{d.jaPossuiam} já tinham</span>
            {d.falhas > 0 && <span className="text-[#f783ac]">{d.falhas} ✘</span>}
            <span className="text-[#6f6699]">{quando(d.criadaEm)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
