// RedefinirPage v84 — aterrissagem do link de recuperação enviado por e-mail.
import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { trpc } from "../trpc";

export default function RedefinirPage() {
  const nav = useNavigate();
  const [busca] = useSearchParams();
  const token = busca.get("token") || "";
  const redefinir = trpc.auth.redefinirSenha.useMutation();
  const [senha, definirSenha] = useState("");
  const [senha2, definirSenha2] = useState("");
  const [ver, definirVer] = useState(false);
  const [erro, definirErro] = useState("");
  const [codigo, definirCodigo] = useState("");

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    definirErro("");
    if (senha !== senha2) { definirErro("As senhas não são iguais."); return; }
    try {
      const res = await redefinir.mutateAsync({ token, novaSenha: senha });
      if (res.ok && res.novoCodigoRecuperacao) definirCodigo(res.novoCodigoRecuperacao);
      else if (res.ok) nav("/entrar");
    } catch (err) {
      definirErro(err instanceof Error ? err.message : "Falha ao redefinir a senha.");
    }
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-md px-4 py-10 text-center">
        <h1 className="text-xl font-extrabold text-racha-laranja">Link incompleto</h1>
        <p className="mt-2 text-sm text-zinc-400">Abra o link exato que chegou no seu e-mail.</p>
        <Link to="/entrar" className="mt-4 inline-block rounded-lg bg-racha-laranja px-5 py-2.5 font-bold text-black">Voltar ao login</Link>
      </div>
    );
  }

  if (codigo) {
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <div className="space-y-4 rounded-2xl border border-racha-laranja/50 bg-racha-carta p-5 text-center">
          <h2 className="text-lg font-extrabold text-racha-laranja">SENHA REDEFINIDA</h2>
          <p className="text-xs text-zinc-400">
            Todas as sessões antigas foram encerradas. Guarde o novo código de recuperação — ele aparece somente agora.
          </p>
          <div className="rounded-xl bg-zinc-900 px-3 py-4 font-mono text-lg font-bold tracking-widest text-racha-laranja">{codigo}</div>
          <button onClick={() => nav("/entrar")} className="w-full rounded-lg bg-racha-laranja py-3 font-extrabold text-black">
            IR PARA O LOGIN
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="mb-6 text-center">
        <div className="text-3xl font-black tracking-widest text-racha-laranja">RACHA</div>
        <p className="mt-1 text-sm text-zinc-400">Defina uma nova senha para sua conta.</p>
      </div>
      <form onSubmit={enviar} className="space-y-4 rounded-2xl border border-racha-borda bg-racha-carta p-5">
        {[
          { rotulo: "Nova senha", valor: senha, mudar: definirSenha, dica: "Mínimo 8 caracteres, com letra e número." },
          { rotulo: "Confirmar nova senha", valor: senha2, mudar: definirSenha2, dica: undefined },
        ].map((c) => (
          <label key={c.rotulo} className="block text-left">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-zinc-400">{c.rotulo}</span>
            <div className="relative">
              <input
                type={ver ? "text" : "password"}
                value={c.valor}
                onChange={(e) => c.mudar(e.target.value)}
                className="w-full rounded-lg border border-racha-borda bg-zinc-900 px-3 py-2.5 pr-11 outline-none focus:border-racha-laranja"
                autoComplete="new-password"
                required
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
            {c.dica && <span className="mt-1 block text-[11px] text-zinc-500">{c.dica}</span>}
          </label>
        ))}
        {erro && <p className="rounded-lg bg-red-950/60 px-3 py-2 text-sm text-red-300">{erro}</p>}
        <button
          type="submit"
          disabled={redefinir.isPending}
          className="w-full rounded-lg bg-racha-laranja py-3 font-extrabold text-black disabled:opacity-50"
        >
          {redefinir.isPending ? "Salvando..." : "SALVAR NOVA SENHA"}
        </button>
      </form>
    </div>
  );
}
