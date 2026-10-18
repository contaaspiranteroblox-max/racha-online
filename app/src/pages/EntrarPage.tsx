// EntrarPage v84 — entrada obrigatória: login, cadastro completo e recuperação
// (código de 12 dígitos OU link de e-mail).
// v88.1: os imports certos (o cliente tRPC e a sessão da plataforma: antes apontavam para arquivos que não existem e o
// build do site parava aqui); a sessão nova chega pelo cookie (o servidor grava) e o recarregar() traz a conta; com o
// cadastro FECHADO (o padrão: só o Dono cria contas, no RACHA CONTROL) a aba "Criar conta" some e fica o aviso.
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router";
import { useAuth } from "@/lib/racha";
import { trpc } from "@/providers/trpc";

type Aba = "entrar" | "criar" | "recuperar";

export default function EntrarPage() {
  const nav = useNavigate();
  const [busca] = useSearchParams();
  const { conta, recarregar } = useAuth();
  // (sem resposta do servidor, a aba aparece: se o cadastro estiver fechado, o servidor recusa com a explicação)
  const cadastro = trpc.auth.cadastro.useQuery(undefined, { retry: false, staleTime: 60_000 });
  const fechado = cadastro.data?.aberto === false;
  const pedida = busca.get("aba");
  const [aba, definirAba] = useState<Aba>(pedida === "criar" ? "criar" : pedida === "recuperar" ? "recuperar" : "entrar");
  const abaAgora: Aba = fechado && aba === "criar" ? "entrar" : aba;
  const destino = busca.get("destino") || "/";
  const entrou = async () => {
    await recarregar();
    nav(destino);
  };
  const abas = ([["entrar", "Entrar"], ["criar", "Criar conta"], ["recuperar", "Recuperar"]] as [Aba, string][]).filter(([v]) => !(fechado && v === "criar"));

  if (conta) {
    const destino = busca.get("destino") || "/";
    return (
      <div className="mx-auto max-w-md px-4 py-10 text-center">
        <h1 className="text-xl font-extrabold text-racha-laranja">Você já está logado</h1>
        <p className="mt-2 text-sm text-zinc-300">{conta.nomeExibicao} · {conta.username}</p>
        <button onClick={() => nav(destino)} className="mt-4 rounded-lg bg-racha-laranja px-5 py-2.5 font-bold text-black">
          Continuar
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <div className="mb-6 text-center">
        <div className="text-3xl font-black tracking-widest text-racha-laranja">RACHA</div>
        <p className="mt-1 text-sm text-zinc-400">Entre para jogar online, participar das salas e salvar seu progresso.</p>
      </div>

      <div className={`mb-5 grid ${abas.length === 3 ? "grid-cols-3" : "grid-cols-2"} gap-1 rounded-xl border border-racha-borda bg-racha-carta p-1 text-sm font-bold`}>
        {abas.map(([v, rotulo]) => (
          <button
            key={v}
            onClick={() => definirAba(v)}
            className={`rounded-lg px-3 py-2 ${abaAgora === v ? "bg-racha-laranja text-black" : "text-zinc-300 hover:bg-zinc-800"}`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {fechado && abaAgora === "entrar" && (
        <p data-testid="aviso-cadastro-fechado" className="mb-4 rounded-xl border border-racha-borda bg-zinc-900/70 px-3 py-2.5 text-center text-xs text-zinc-300">
          <b className="text-racha-laranja">Contas novas:</b> quem cria é o dono do RACHA. Peça a sua — depois é só entrar aqui com o usuário e a senha que ele mandar.
        </p>
      )}
      {abaAgora === "entrar" && <FormEntrar onFeito={entrou} onEsqueci={() => definirAba("recuperar")} />}
      {abaAgora === "criar" && <FormCriar onFeito={entrou} />}
      {abaAgora === "recuperar" && <FormRecuperar onFeito={() => definirAba("entrar")} />}
    </div>
  );
}

function CampoSenha({ rotulo, valor, onChange, dica }: { rotulo: string; valor: string; onChange: (v: string) => void; dica?: string }) {
  const [ver, definirVer] = useState(false);
  return (
    <label className="block text-left">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-zinc-400">{rotulo}</span>
      <div className="relative">
        <input
          type={ver ? "text" : "password"}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-racha-borda bg-zinc-900 px-3 py-2.5 pr-11 outline-none focus:border-racha-laranja"
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => definirVer(!ver)}
          aria-label={ver ? "Ocultar senha" : "Mostrar senha"}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-zinc-400 hover:text-white"
        >
          {ver ? "🙈" : "👁"}
        </button>
      </div>
      {dica && <span className="mt-1 block text-[11px] text-zinc-500">{dica}</span>}
    </label>
  );
}

function FormEntrar({ onFeito, onEsqueci }: { onFeito: () => void; onEsqueci: () => void }) {
  const entrar = trpc.auth.entrar.useMutation();
  const [identificador, definirIdentificador] = useState("");
  const [senha, definirSenha] = useState("");
  const [erro, definirErro] = useState("");

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    definirErro("");
    try {
      const res = await entrar.mutateAsync({ identificador: identificador.trim(), senha });
      if (res.conta) onFeito(); // (a sessão já veio no cookie: o onFeito busca a conta e segue)
    } catch (err) {
      definirErro(err instanceof Error ? err.message : "Falha ao entrar.");
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-4 rounded-2xl border border-racha-borda bg-racha-carta p-5">
      <label className="block text-left">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-zinc-400">E-mail ou usuário</span>
        <input
          value={identificador}
          onChange={(e) => definirIdentificador(e.target.value)}
          className="w-full rounded-lg border border-racha-borda bg-zinc-900 px-3 py-2.5 outline-none focus:border-racha-laranja"
          autoComplete="username"
          required
        />
      </label>
      <CampoSenha rotulo="Senha" valor={senha} onChange={definirSenha} />
      <div className="text-right">
        <button type="button" onClick={onEsqueci} className="text-xs font-semibold text-racha-laranja hover:underline">
          Esqueci minha senha
        </button>
      </div>
      {erro && <p className="rounded-lg bg-red-950/60 px-3 py-2 text-sm text-red-300">{erro}</p>}
      <button
        type="submit"
        disabled={entrar.isPending}
        className="w-full rounded-lg bg-racha-laranja py-3 font-extrabold text-black disabled:opacity-50"
      >
        {entrar.isPending ? "Entrando..." : "ENTRAR"}
      </button>
    </form>
  );
}

function FormCriar({ onFeito }: { onFeito: () => void }) {
  const registrar = trpc.auth.registrar.useMutation();
  const [username, definirUsername] = useState("");
  const [nomeExibicao, definirNome] = useState("");
  const [email, definirEmail] = useState("");
  const [senha, definirSenha] = useState("");
  const [senha2, definirSenha2] = useState("");
  const [aceite, definirAceite] = useState(false);
  const [erro, definirErro] = useState("");
  const [codigo, definirCodigo] = useState("");

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    definirErro("");
    if (senha !== senha2) { definirErro("As senhas não são iguais."); return; }
    if (!aceite) { definirErro("É preciso aceitar os termos e a política de privacidade."); return; }
    try {
      const res = await registrar.mutateAsync({
        username: username.trim(),
        nomeExibicao: nomeExibicao.trim(),
        senha,
        confirmacaoSenha: senha2,
        email: email.trim(),
        aceiteTermos: true,
      });
      if (res.conta) {
        if (res.codigoRecuperacao) definirCodigo(res.codigoRecuperacao);
        else onFeito();
      }
    } catch (err) {
      definirErro(err instanceof Error ? err.message : "Falha ao criar a conta.");
    }
  }

  if (codigo) return <CartaoCodigo codigo={codigo} onFechar={onFeito} />;

  return (
    <form onSubmit={enviar} className="space-y-4 rounded-2xl border border-racha-borda bg-racha-carta p-5">
      <label className="block text-left">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-zinc-400">Nome de usuário (login)</span>
        <input
          value={username}
          onChange={(e) => definirUsername(e.target.value)}
          className="w-full rounded-lg border border-racha-borda bg-zinc-900 px-3 py-2.5 outline-none focus:border-racha-laranja"
          autoComplete="off"
          required
        />
        <span className="mt-1 block text-[11px] text-zinc-500">3 a 24 caracteres: letras minúsculas, números, _ e .</span>
      </label>
      <label className="block text-left">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-zinc-400">Nome de exibição</span>
        <input
          value={nomeExibicao}
          onChange={(e) => definirNome(e.target.value)}
          className="w-full rounded-lg border border-racha-borda bg-zinc-900 px-3 py-2.5 outline-none focus:border-racha-laranja"
          required
        />
      </label>
      <label className="block text-left">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-zinc-400">E-mail</span>
        <input
          type="email"
          value={email}
          onChange={(e) => definirEmail(e.target.value)}
          className="w-full rounded-lg border border-racha-borda bg-zinc-900 px-3 py-2.5 outline-none focus:border-racha-laranja"
          autoComplete="email"
          required
        />
        <span className="mt-1 block text-[11px] text-zinc-500">Serve para recuperar a senha e avisos da conta.</span>
      </label>
      <CampoSenha rotulo="Senha" valor={senha} onChange={definirSenha} dica="Mínimo 8 caracteres, com letra e número." />
      <CampoSenha rotulo="Confirmar senha" valor={senha2} onChange={definirSenha2} />
      <label className="flex items-start gap-2 text-left text-xs text-zinc-300">
        <input type="checkbox" checked={aceite} onChange={(e) => definirAceite(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#FF6A00]" />
        <span>
          Li e aceito os <Link to="/termos" className="font-semibold text-racha-laranja hover:underline">termos de uso</Link> e a{" "}
          <Link to="/privacidade" className="font-semibold text-racha-laranja hover:underline">política de privacidade</Link> do RACHA.
        </span>
      </label>
      {erro && <p className="rounded-lg bg-red-950/60 px-3 py-2 text-sm text-red-300">{erro}</p>}
      <button
        type="submit"
        disabled={registrar.isPending}
        className="w-full rounded-lg bg-racha-laranja py-3 font-extrabold text-black disabled:opacity-50"
      >
        {registrar.isPending ? "Criando..." : "CRIAR CONTA"}
      </button>
    </form>
  );
}

// (pelo código: o servidor troca a senha, encerra as sessões e dá um código novo — depois é entrar com a senha nova)
function FormRecuperar({ onFeito }: { onFeito: () => void }) {
  const recuperar = trpc.auth.recuperar.useMutation();
  const pedirEmail = trpc.auth.pedirRecuperacaoEmail.useMutation();
  const [modo, definirModo] = useState<"email" | "codigo">("email");
  const [email, definirEmail] = useState("");
  const [avisoEmail, definirAvisoEmail] = useState("");
  const [identificador, definirIdentificador] = useState("");
  const [codigoRec, definirCodigoRec] = useState("");
  const [senha, definirSenha] = useState("");
  const [senha2, definirSenha2] = useState("");
  const [erro, definirErro] = useState("");
  const [codigo, definirCodigo] = useState("");

  // (o código é RACHA- e três grupos de 4 letras/números de 0 a F: security.ts → novoCodigoRecuperacao)
  const codigoValido = useMemo(() => /^RACHA-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/i.test(codigoRec.trim()), [codigoRec]);

  async function pedirPorEmail(e: React.FormEvent) {
    e.preventDefault();
    definirErro("");
    try {
      const res = await pedirEmail.mutateAsync({ email: email.trim() });
      definirAvisoEmail(res.mensagem);
    } catch (err) {
      definirErro(err instanceof Error ? err.message : "Falha ao pedir recuperação.");
    }
  }

  async function redefinirPorCodigo(e: React.FormEvent) {
    e.preventDefault();
    definirErro("");
    if (senha !== senha2) { definirErro("As senhas não são iguais."); return; }
    try {
      const res = await recuperar.mutateAsync({
        username: identificador.trim(),
        codigo: codigoRec.trim().toUpperCase(),
        novaSenha: senha,
      });
      if (res.ok && res.novoCodigoRecuperacao) definirCodigo(res.novoCodigoRecuperacao);
      else if (res.ok) onFeito();
    } catch (err) {
      definirErro(err instanceof Error ? err.message : "Falha ao recuperar.");
    }
  }

  if (codigo) return <CartaoCodigo codigo={codigo} onFechar={onFeito} textoBotao="JÁ ANOTEI — ENTRAR COM A SENHA NOVA" />;

  return (
    <div className="space-y-4 rounded-2xl border border-racha-borda bg-racha-carta p-5">
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-zinc-900 p-1 text-xs font-bold">
        <button onClick={() => definirModo("email")} className={`rounded-md px-2 py-1.5 ${modo === "email" ? "bg-racha-laranja text-black" : "text-zinc-300"}`}>
          Pelo e-mail
        </button>
        <button onClick={() => definirModo("codigo")} className={`rounded-md px-2 py-1.5 ${modo === "codigo" ? "bg-racha-laranja text-black" : "text-zinc-300"}`}>
          Pelo código RACHA
        </button>
      </div>

      {modo === "email" ? (
        <form onSubmit={pedirPorEmail} className="space-y-4">
          <p className="text-xs text-zinc-400">
            Informe o e-mail da conta. Se ele estiver cadastrado, você recebe um link para redefinir a senha (vale por 1 hora).
          </p>
          <input
            type="email"
            value={email}
            onChange={(e) => definirEmail(e.target.value)}
            placeholder="seu@email.com"
            className="w-full rounded-lg border border-racha-borda bg-zinc-900 px-3 py-2.5 outline-none focus:border-racha-laranja"
            required
          />
          {avisoEmail && <p className="rounded-lg bg-emerald-950/60 px-3 py-2 text-sm text-emerald-300">{avisoEmail}</p>}
          {erro && <p className="rounded-lg bg-red-950/60 px-3 py-2 text-sm text-red-300">{erro}</p>}
          <button
            type="submit"
            disabled={pedirEmail.isPending || !!avisoEmail}
            className="w-full rounded-lg bg-racha-laranja py-3 font-extrabold text-black disabled:opacity-50"
          >
            {pedirEmail.isPending ? "Enviando..." : "ENVIAR LINK"}
          </button>
        </form>
      ) : (
        <form onSubmit={redefinirPorCodigo} className="space-y-4">
          <p className="text-xs text-zinc-400">Use o código RACHA-XXXX-XXXX-XXXX mostrado quando você criou a conta.</p>
          <input
            value={identificador}
            onChange={(e) => definirIdentificador(e.target.value)}
            placeholder="Seu usuário (login)"
            className="w-full rounded-lg border border-racha-borda bg-zinc-900 px-3 py-2.5 outline-none focus:border-racha-laranja"
            required
          />
          <input
            value={codigoRec}
            onChange={(e) => definirCodigoRec(e.target.value)}
            placeholder="RACHA-0000-0000-0000"
            className="w-full rounded-lg border border-racha-borda bg-zinc-900 px-3 py-2.5 font-mono uppercase tracking-wider outline-none focus:border-racha-laranja"
            required
          />
          <CampoSenha rotulo="Nova senha" valor={senha} onChange={definirSenha} dica="Mínimo 8 caracteres, com letra e número." />
          <CampoSenha rotulo="Confirmar nova senha" valor={senha2} onChange={definirSenha2} />
          {erro && <p className="rounded-lg bg-red-950/60 px-3 py-2 text-sm text-red-300">{erro}</p>}
          <button
            type="submit"
            disabled={recuperar.isPending || !codigoValido}
            className="w-full rounded-lg bg-racha-laranja py-3 font-extrabold text-black disabled:opacity-50"
          >
            {recuperar.isPending ? "Redefinindo..." : "REDEFINIR SENHA"}
          </button>
        </form>
      )}
    </div>
  );
}

function CartaoCodigo({ codigo, onFechar, textoBotao = "JÁ ANOTEI — CONTINUAR" }: { codigo: string; onFechar: () => void; textoBotao?: string }) {
  const [copiado, definirCopiado] = useState(false);
  return (
    <div className="space-y-4 rounded-2xl border border-racha-laranja/50 bg-racha-carta p-5 text-center">
      <h2 className="text-lg font-extrabold text-racha-laranja">GUARDE SEU CÓDIGO DE RECUPERAÇÃO</h2>
      <p className="text-xs text-zinc-400">
        Ele aparece <strong className="text-zinc-200">somente agora</strong> e substitui qualquer código anterior.
        Anote em papel ou gerenciador de senhas — sem ele e sem acesso ao e-mail, a conta não pode ser recuperada.
      </p>
      <div className="rounded-xl bg-zinc-900 px-3 py-4 font-mono text-lg font-bold tracking-widest text-racha-laranja">{codigo}</div>
      <button
        onClick={() => { navigator.clipboard?.writeText(codigo).then(() => definirCopiado(true)).catch(() => {}); }}
        className="w-full rounded-lg border border-racha-borda py-2.5 text-sm font-bold text-zinc-200 hover:bg-zinc-800"
      >
        {copiado ? "Copiado ✓" : "Copiar código"}
      </button>
      <button onClick={onFechar} className="w-full rounded-lg bg-racha-laranja py-3 font-extrabold text-black">
        {textoBotao}
      </button>
    </div>
  );
}
