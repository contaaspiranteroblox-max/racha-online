// ============================================================================
// RACHA v88.1 — RACHA CONTROL › CONTAS (só o Dono)
// · o resumo: quantas contas, o número da próxima e o CADASTRO PÚBLICO (fechado = só o Dono cria contas; aberto = qualquer
//   um cria pelo jogo, como antes);
// · CRIAR CONTA: usuário, nome no jogo, e-mail (opcional) e senha (em branco = o servidor gera uma fácil de ditar). O usuário,
//   a senha e o código de recuperação aparecem UMA vez, com o texto pronto para mandar ao jogador;
// · as contas (busca por nome, usuário ou ID) com a SENHA NOVA de cada uma (as sessões dela caem);
// · ZERAR CONTAS (só a conta 000001): apaga todas as outras contas e os números voltam a contar do 000002.
// Tudo pelas rotas donoContas.* (a sessão do painel com o 2FA; o servidor confere o cargo de Dono e audita cada ação).
// ============================================================================
import { useState } from "react";
import { trpc } from "@/providers/trpc";

type Conta = {
  idPublico: string; username: string; nomeExibicao: string; email: string | null; estado: string;
  criadoEm: string | Date; ultimoLoginEm: string | Date | null; cargo: string | null; dono: boolean;
};
type Credenciais = { idPublico: string; username: string; senha: string; codigoRecuperacao?: string; titulo: string };

const NOME_CARGO: Record<string, string> = { dono: "Dono", administrador: "Administrador", moderador: "Moderador", ajudante: "Ajudante" };
const data = (d: string | Date | null) => (d ? new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—");

function Aviso({ msg, tipo = "info" }: { msg: string; tipo?: "info" | "erro" | "ok" }) {
  if (!msg) return null;
  const cor = tipo === "erro" ? "border-[#e03131] bg-[#e03131]/15 text-[#ffb4a8]" : tipo === "ok" ? "border-[#2b8a3e] bg-[#2b8a3e]/15 text-[#b2f2bb]" : "border-[#7048e8] bg-[#7048e8]/15 text-[#d0bfff]";
  return <div role={tipo === "erro" ? "alert" : "status"} className={`mt-3 rounded-xl border-2 px-3 py-2 text-sm ${cor}`}>{msg}</div>;
}
function Campo({ rotulo, dica, children }: { rotulo: string; dica?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs tracking-widest text-[#b0a6e8]">{rotulo}</span>
      <div className="mt-1">{children}</div>
      {dica && <span className="mt-1 block text-[11px] text-[#6f6699]">{dica}</span>}
    </label>
  );
}

// o cartão com o usuário e a senha (aparece uma vez): o texto pronto para mandar ao jogador
function CartaoCredenciais({ c, aoFechar }: { c: Credenciais; aoFechar: () => void }) {
  const [copiado, setCopiado] = useState(false);
  const texto = [
    "Sua conta do RACHA",
    `ID: ${c.idPublico}`,
    `Usuário: ${c.username}`,
    `Senha: ${c.senha}`,
    ...(c.codigoRecuperacao ? [`Código de recuperação (guarde): ${c.codigoRecuperacao}`] : []),
    "Abra o jogo, toque em ENTRAR e use o usuário e a senha.",
  ].join("\n");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" role="dialog" aria-modal="true" aria-label={c.titulo}>
      <div className="cartao-rua w-full max-w-md p-5" data-testid="credenciais">
        <h3 className="texto-pixo text-xl">{c.titulo}</h3>
        <p className="mt-1 text-xs text-[#ffd23f]">Aparece só agora: o banco guarda só o código embaralhado da senha. Mande para o jogador por um canal seu (WhatsApp, pessoalmente).</p>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 rounded-xl bg-black/40 p-3 text-sm">
          <dt className="text-[#b0a6e8]">ID</dt><dd className="font-mono" data-testid="cred-id">{c.idPublico}</dd>
          <dt className="text-[#b0a6e8]">Usuário</dt><dd className="select-all font-mono" data-testid="cred-usuario">{c.username}</dd>
          <dt className="text-[#b0a6e8]">Senha</dt><dd className="select-all font-mono text-[#ffd23f]" data-testid="cred-senha">{c.senha}</dd>
          {c.codigoRecuperacao && (<><dt className="text-[#b0a6e8]">Recuperação</dt><dd className="select-all font-mono text-xs">{c.codigoRecuperacao}</dd></>)}
        </dl>
        <div className="mt-4 flex gap-2">
          <button
            className="botao-racha botao-roxo flex-1 px-3 py-2 text-sm"
            onClick={() => { navigator.clipboard?.writeText(texto).then(() => setCopiado(true)).catch(() => {}); }}
          >
            {copiado ? "COPIADO ✓" : "COPIAR PARA MANDAR"}
          </button>
          <button className="botao-racha botao-verde flex-1 px-3 py-2 text-sm" onClick={aoFechar}>JÁ ANOTEI</button>
        </div>
      </div>
    </div>
  );
}

const FORM_VAZIO = { username: "", nomeExibicao: "", email: "", senha: "", aceite: false };

export function AbaContas() {
  const estado = trpc.donoContas.estado.useQuery();
  const [busca, setBusca] = useState("");
  const lista = trpc.donoContas.listar.useQuery({ busca: busca.trim(), limite: 200 });
  const [f, setF] = useState({ ...FORM_VAZIO });
  const [msg, setMsg] = useState<{ t: string; tipo: "info" | "erro" | "ok" }>({ t: "", tipo: "info" });
  const [cred, setCred] = useState<Credenciais | null>(null);
  const [trocaPara, setTrocaPara] = useState<Conta | null>(null);
  const [zSenha, setZSenha] = useState("");
  const [zPalavra, setZPalavra] = useState("");
  const [zMsg, setZMsg] = useState<{ t: string; tipo: "info" | "erro" | "ok" }>({ t: "", tipo: "info" });
  const atualiza = () => { estado.refetch(); lista.refetch(); };

  const criar = trpc.donoContas.criar.useMutation({
    onSuccess: (r) => {
      setCred({ idPublico: r.idPublico, username: r.username, senha: r.senha, codigoRecuperacao: r.codigoRecuperacao, titulo: "CONTA CRIADA" });
      setMsg({ t: `Conta ${r.idPublico} (${r.username}) criada.`, tipo: "ok" });
      setF({ ...FORM_VAZIO });
      atualiza();
    },
    onError: (e) => setMsg({ t: e.message, tipo: "erro" }),
  });
  const novaSenha = trpc.donoContas.novaSenha.useMutation({
    onSuccess: (r) => { setTrocaPara(null); setCred({ idPublico: r.idPublico, username: r.username, senha: r.senha, codigoRecuperacao: r.codigoRecuperacao, titulo: "SENHA NOVA" }); },
    onError: (e) => { setTrocaPara(null); setMsg({ t: e.message, tipo: "erro" }); },
  });
  const cadastro = trpc.donoContas.cadastro.useMutation({ onSuccess: () => estado.refetch(), onError: (e) => setMsg({ t: e.message, tipo: "erro" }) });
  const zerar = trpc.donoContas.zerar.useMutation({
    onSuccess: (r) => {
      setZSenha(""); setZPalavra("");
      setZMsg({ t: `Pronto: ${r.apagadas} conta(s) apagada(s). Você continua sendo a ${r.eu}; a próxima conta criada vai ser a ${r.proximo}.`, tipo: "ok" });
      atualiza();
    },
    onError: (e) => setZMsg({ t: e.message, tipo: "erro" }),
  });

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setMsg({ t: "", tipo: "info" });
    const username = f.username.trim().toLowerCase();
    // (as mesmas regras do servidor, para avisar antes; quem decide é o servidor)
    if (!/^[a-z0-9_.]{3,24}$/.test(username)) return setMsg({ t: "Usuário: 3 a 24 caracteres, só letras minúsculas, números, _ ou . (sem espaço nem acento).", tipo: "erro" });
    if (f.nomeExibicao.trim().length < 2) return setMsg({ t: "Escreva o nome que aparece no jogo (2 a 32 caracteres).", tipo: "erro" });
    if (f.senha && f.senha.length < 8) return setMsg({ t: "A senha precisa de 8 caracteres ou mais — ou deixe em branco para o servidor gerar uma.", tipo: "erro" });
    if (!f.aceite) return setMsg({ t: "Confirme que o jogador aceitou os termos de uso e a política de privacidade.", tipo: "erro" });
    criar.mutate({ username, nomeExibicao: f.nomeExibicao.trim(), email: f.email.trim(), senha: f.senha, aceiteTermos: true });
  }

  const e = estado.data;
  const contas = (lista.data ?? []) as Conta[];
  const muda = (k: keyof typeof FORM_VAZIO, v: string | boolean) => setF((o) => ({ ...o, [k]: v }));
  if (estado.error) return <div className="cartao-rua p-5 text-sm text-[#ffb4a8]">{estado.error.message}</div>;

  return (
    <div className="space-y-4" data-testid="aba-contas">
      {/* ---------------------------------------------------------------- o resumo e o cadastro público */}
      <div className="cartao-rua p-5">
        <h3 className="texto-pixo text-xl">CONTAS DO RACHA</h3>
        <p className="mt-1 text-xs text-[#b0a6e8]">Só a conta do Dono (000001) vê esta aba. As contas novas saem daqui e você manda o usuário e a senha para o jogador.</p>
        {estado.isLoading || !e ? (
          <p className="mt-3 text-sm text-[#b0a6e8]">Carregando…</p>
        ) : (
          <>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-lg bg-black/40 px-3 py-1.5">Contas: <b data-testid="total-contas">{e.total}</b></span>
              <span className="rounded-lg bg-black/40 px-3 py-1.5">Próxima conta: <b className="font-mono" data-testid="proxima-conta">{e.proximo}</b></span>
              <span className="rounded-lg bg-black/40 px-3 py-1.5">Você: <b className="font-mono">{e.eu}</b></span>
              {e.zeradoEm && <span className="rounded-lg bg-black/40 px-3 py-1.5">Zeradas em {new Date(e.zeradoEm).toLocaleString("pt-BR")}</span>}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border-2 border-[#33286b] bg-black/30 px-3 py-2.5">
              <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${e.cadastro.aberto ? "bg-[#e8590c]" : "bg-[#2b8a3e]"}`} data-testid="cadastro-estado">
                {e.cadastro.aberto ? "CADASTRO ABERTO" : "CADASTRO FECHADO"}
              </span>
              <span className="flex-1 text-xs text-[#d8d2f5]">
                {e.cadastro.aberto ? "Qualquer pessoa cria a conta pelo jogo (CRIAR CONTA)." : "Só você cria contas, por aqui. No jogo, o CRIAR CONTA some."}
                {e.cadastro.fonte === "ambiente" && " (Veio de RACHA_CADASTRO no servidor; o botão grava a sua escolha no banco.)"}
              </span>
              <button
                className={`botao-racha ${e.cadastro.aberto ? "botao-verde" : "botao-fantasma"} px-3 py-1.5 text-xs`}
                disabled={cadastro.isPending}
                onClick={() => cadastro.mutate({ aberto: !e.cadastro.aberto })}
              >
                {e.cadastro.aberto ? "FECHAR O CADASTRO" : "ABRIR O CADASTRO"}
              </button>
            </div>
          </>
        )}
      </div>

      {/* ---------------------------------------------------------------- criar conta */}
      <form className="cartao-rua p-5" onSubmit={enviar} noValidate>
        <h3 className="texto-pixo text-xl">CRIAR CONTA</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Campo rotulo="USUÁRIO (LOGIN)" dica="3 a 24: letras minúsculas, números, _ ou .">
            <input className="input-racha" value={f.username} maxLength={24} autoComplete="off" onChange={(x) => muda("username", x.target.value.toLowerCase())} placeholder="kauazin7" aria-label="Usuário (login)" />
          </Campo>
          <Campo rotulo="NOME NO JOGO">
            <input className="input-racha" value={f.nomeExibicao} maxLength={32} onChange={(x) => muda("nomeExibicao", x.target.value)} placeholder="Kauã" aria-label="Nome no jogo" />
          </Campo>
          <Campo rotulo="E-MAIL (OPCIONAL)" dica="Serve para o jogador recuperar a senha sozinho.">
            <input className="input-racha" type="email" value={f.email} maxLength={120} onChange={(x) => muda("email", x.target.value)} placeholder="jogador@email.com" aria-label="E-mail (opcional)" />
          </Campo>
          <Campo rotulo="SENHA (OPCIONAL)" dica="Em branco: o servidor gera uma fácil de ditar (ex.: abcd-EFGH-2345).">
            <input className="input-racha" type="text" value={f.senha} maxLength={100} autoComplete="new-password" onChange={(x) => muda("senha", x.target.value)} placeholder="em branco = gerada" aria-label="Senha (opcional)" />
          </Campo>
        </div>
        <label className="mt-3 flex items-start gap-2 text-xs text-[#d8d2f5]">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#ffd23f]" checked={f.aceite} onChange={(x) => muda("aceite", x.target.checked)} aria-label="O jogador aceitou os termos" />
          <span>O jogador aceitou os termos de uso e a política de privacidade do RACHA.</span>
        </label>
        <Aviso msg={msg.t} tipo={msg.tipo} />
        <button className="botao-racha botao-verde mt-3 w-full px-4 py-3 sm:w-auto" disabled={criar.isPending}>
          {criar.isPending ? "CRIANDO..." : "CRIAR CONTA"}
        </button>
      </form>

      {/* ---------------------------------------------------------------- as contas */}
      <div className="cartao-rua p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="texto-pixo flex-1 text-xl">AS CONTAS</h3>
          <input className="input-racha w-full sm:w-64" value={busca} maxLength={40} onChange={(x) => setBusca(x.target.value)} placeholder="Buscar por nome, usuário ou ID" aria-label="Buscar conta" />
        </div>
        <div className="mt-3 space-y-1.5" data-testid="lista-contas">
          {lista.isLoading && <p className="text-sm text-[#b0a6e8]">Carregando…</p>}
          {lista.error && <p className="text-sm text-[#ffb4a8]">{lista.error.message}</p>}
          {!lista.isLoading && !contas.length && !lista.error && <p className="text-sm text-[#b0a6e8]">Nenhuma conta.</p>}
          {contas.map((c) => (
            <div key={c.idPublico} className="flex flex-wrap items-center gap-2 rounded-xl border border-[#33286b] bg-black/30 px-3 py-2 text-xs">
              <span className="font-mono text-[#ffd23f]">{c.idPublico}</span>
              <b className="min-w-0 flex-1 truncate">{c.nomeExibicao} <span className="font-normal text-[#b0a6e8]">@{c.username}</span></b>
              {c.cargo && <span className="rounded-md bg-[#5f3dc4] px-1.5 py-0.5">{NOME_CARGO[c.cargo] ?? c.cargo}</span>}
              {c.estado !== "ativo" && <span className="rounded-md bg-[#e03131] px-1.5 py-0.5">{c.estado}</span>}
              <span className="text-[#6f6699]">criada {data(c.criadoEm)} · entrou {data(c.ultimoLoginEm)}</span>
              {c.dono ? (
                <span className="text-[#ffd23f]">👑 VOCÊ</span>
              ) : (
                <button className="botao-racha botao-fantasma px-2.5 py-1 text-xs" onClick={() => setTrocaPara(c)}>SENHA NOVA</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ---------------------------------------------------------------- zerar contas */}
      {e?.podeZerar && (
        <div className="cartao-rua border-2 border-[#e03131]/60 p-5">
          <h3 className="texto-pixo text-xl text-[#ff8787]">ZERAR CONTAS</h3>
          <p className="mt-1 text-sm text-[#d8d2f5]">
            Apaga <b>todas as contas, menos a sua ({e.eu})</b>, e tudo o que era delas: progresso, carteira, itens, amigos, mensagens,
            cartas, clubes e partidas. <b>Não tem volta.</b> Os números voltam a contar: a próxima conta criada vai ser a <b>000002</b>.
            Quem estiver jogando com uma conta apagada cai das salas na hora.
          </p>
          <p className="mt-1 text-xs text-[#ffd23f]">Antes: faça uma cópia (backup) do banco de dados.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Campo rotulo="SUA SENHA">
              <input className="input-racha" type="password" value={zSenha} autoComplete="current-password" onChange={(x) => setZSenha(x.target.value)} aria-label="Sua senha" />
            </Campo>
            <Campo rotulo='ESCREVA "ZERAR"'>
              <input className="input-racha font-mono" value={zPalavra} maxLength={10} onChange={(x) => setZPalavra(x.target.value)} placeholder="ZERAR" aria-label="Escreva ZERAR" />
            </Campo>
          </div>
          <Aviso msg={zMsg.t} tipo={zMsg.tipo} />
          <button
            className="botao-racha botao-amarelo mt-3 w-full px-4 py-3 sm:w-auto"
            disabled={zerar.isPending || zPalavra.trim() !== "ZERAR" || !zSenha}
            onClick={() => { setZMsg({ t: "", tipo: "info" }); zerar.mutate({ senha: zSenha, confirmacao: zPalavra.trim() }); }}
          >
            {zerar.isPending ? "ZERANDO..." : "ZERAR AS CONTAS"}
          </button>
        </div>
      )}

      {trocaPara && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setTrocaPara(null)}>
          <div className="cartao-rua w-full max-w-sm p-5" onClick={(x) => x.stopPropagation()} role="dialog" aria-modal="true" aria-label="Senha nova">
            <h3 className="texto-pixo text-xl">SENHA NOVA</h3>
            <p className="mt-3 text-sm text-[#d8d2f5]">
              Gerar uma senha nova para <b>{trocaPara.nomeExibicao}</b> (<span className="font-mono">{trocaPara.idPublico}</span>)? A senha de agora e o código de recuperação antigo param de valer e a conta sai de todos os aparelhos.
            </p>
            <div className="mt-4 flex gap-2">
              <button className="botao-racha botao-amarelo flex-1 px-3 py-2 text-sm" disabled={novaSenha.isPending} onClick={() => novaSenha.mutate({ conta: trocaPara.idPublico })}>GERAR</button>
              <button className="botao-racha botao-fantasma flex-1 px-3 py-2 text-sm" onClick={() => setTrocaPara(null)}>CANCELAR</button>
            </div>
          </div>
        </div>
      )}
      {cred && <CartaoCredenciais c={cred} aoFechar={() => setCred(null)} />}
    </div>
  );
}
