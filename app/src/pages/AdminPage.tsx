// ============================================================================
// RACHA 2.0 — RACHA CONTROL: o login do painel (com o 2FA) e os DOIS PAINÉIS (v109): o Dono cai no PAINEL DO DONO (tudo) e
// a staff (Administrador, Moderador, Ajudante) no PAINEL DA STAFF (moderação). O servidor decide quem é quem (estadoPainel).
// v109: o 2FA com QR code (o app autenticador lê com a câmera), a chave de 32 letras (a de 20 letras, que alguns apps
// recusavam, foi trocada), o botão que abre o app no celular e o aviso quando o relógio deste aparelho está errado.
// ============================================================================
import { useMemo, useState } from "react";
import { trpc } from "@/providers/trpc";
import { qrMatriz, qrCaminho } from "@/lib/qr109";
import PainelDono from "./PainelDono";
import PainelStaff from "./PainelStaff";

type EstadoPainel = {
  logado: boolean;
  totpVerificado?: boolean;
  usuario?: { nome: string; username: string; avatarEmoji: string; idPublico?: string };
  cargo?: string;
  permissoes?: string[];
  painel?: "dono" | "staff";
};

export default function AdminPage() {
  const estado = trpc.admin.estadoPainel.useQuery(undefined, { retry: false });
  if (estado.isLoading) return <div className="mt-16 text-center text-[#b0a6e8]">Abrindo o RACHA CONTROL...</div>;
  const e = (estado.data ?? { logado: false }) as EstadoPainel;
  if (!e.logado) return <LoginPainel />;
  if (!e.totpVerificado) return <Tela2FA />;
  const painel = e.painel ?? (e.cargo === "dono" ? "dono" : "staff");
  if (painel === "dono") return <PainelDono permissoes={e.permissoes ?? []} usuario={e.usuario!} sair={<BotaoSairPainel />} />;
  return <PainelStaff cargo={e.cargo!} permissoes={e.permissoes ?? []} usuario={e.usuario!} sair={<BotaoSairPainel />} />;
}

// ============================================================================
// LOGIN DO PAINEL
// ============================================================================
function LoginPainel() {
  const [username, setUsername] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [pendente, setPendente] = useState<{ token: string; url2fa: string | null; desvio: number } | null>(null);
  const [codigo, setCodigo] = useState("");
  const utils = trpc.useUtils();

  const login = trpc.admin.loginPainel.useMutation({
    // v109: a diferença entre o relógio deste aparelho e o do servidor (o código do 2FA depende da hora)
    onSuccess: (r) => setPendente({ token: r.token, url2fa: r.url2fa, desvio: typeof r.agora === "number" ? Date.now() - r.agora : 0 }),
    onError: (e) => setErro(e.message),
  });
  const verificar = trpc.admin.verificar2fa.useMutation({
    onSuccess: () => utils.admin.estadoPainel.invalidate(),
    onError: (e) => { setErro(e.message); setCodigo(""); },
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
            <input className="input-racha" placeholder="Usuário da equipe" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
            <input className="input-racha" type="password" placeholder="Senha" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" />
            {erro && <div className="rounded-xl border-2 border-[#e03131] bg-[#e03131]/15 px-3 py-2 text-sm text-[#ffb4a8]">{erro}</div>}
            <button className="botao-racha botao-roxo w-full px-4 py-3" disabled={login.isPending}>
              {login.isPending ? "VERIFICANDO..." : "ENTRAR NO PAINEL"}
            </button>
            <p className="text-center text-xs text-[#6f6699]">Todas as tentativas são registradas na auditoria.</p>
          </form>
        ) : (
          <form className="space-y-3 p-6" onSubmit={(e) => { e.preventDefault(); setErro(""); verificar.mutate({ token: pendente.token, codigo: codigo.trim() }); }}>
            {pendente.url2fa && <Configurar2FA url={pendente.url2fa} />}
            {Math.abs(pendente.desvio) > 60000 && (
              <div className="rounded-xl border-2 border-[#ff922b] bg-[#ff922b]/10 p-2 text-xs text-[#ffd8a8]" data-testid="aviso-relogio">
                ⏰ O relógio deste aparelho está uns {Math.round(Math.abs(pendente.desvio) / 60000)} min {pendente.desvio > 0 ? "adiantado" : "atrasado"} em relação ao servidor.
                O código do 2FA depende da hora: deixe o celular (e este aparelho) com "Data e hora automáticas".
              </div>
            )}
            <label className="block text-xs tracking-widest text-[#b0a6e8]">CÓDIGO DO APP AUTENTICADOR</label>
            <input className="input-racha text-center font-mono text-2xl tracking-[8px]" placeholder="000000" maxLength={6} inputMode="numeric" autoComplete="one-time-code"
              value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))} />
            {erro && <div className="rounded-xl border-2 border-[#e03131] bg-[#e03131]/15 px-3 py-2 text-sm text-[#ffb4a8]" data-testid="erro-2fa">{erro}</div>}
            <button className="botao-racha botao-verde w-full px-4 py-3" disabled={verificar.isPending || codigo.length !== 6}>
              {verificar.isPending ? "CONFIRMANDO..." : "CONFIRMAR 2FA"}
            </button>
            <button type="button" className="w-full text-center text-xs text-[#6f6699] underline" onClick={() => { setPendente(null); setCodigo(""); setErro(""); }}>
              voltar para o login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// v109: a configuração do 2FA: o QR code (o jeito fácil), o botão que abre o app no celular e a chave para digitar
function Configurar2FA({ url }: { url: string }) {
  const chave = chave2fa(url);
  const qr = useMemo(() => { const m = qrMatriz(url); return m ? qrCaminho(m, 4) : null; }, [url]);
  const [copiado, setCopiado] = useState(false);
  const copia = () => {
    const t = chave.replace(/\s/g, "");
    navigator.clipboard?.writeText(t).then(() => setCopiado(true), () => setCopiado(false));
  };
  return (
    <div className="space-y-2 rounded-xl border-2 border-[#ffd23f] bg-[#ffd23f]/10 p-3 text-sm" data-testid="configurar-2fa">
      <div><b>Configure o seu 2FA</b> (uma vez só):</div>
      <ol className="list-decimal space-y-1 pl-5 text-xs text-[#d8d2f5]">
        <li>Abra o app autenticador no celular (Google Authenticator, Microsoft Authenticator, Authy...) e toque em <b>+</b>.</li>
        <li>Escolha <b>Ler QR code</b> e aponte a câmera para o código abaixo.</li>
        <li>Digite aqui embaixo o código de 6 números que aparecer na RACHA (ele muda a cada 30 s).</li>
      </ol>
      {qr && (
        <div className="mx-auto w-full max-w-[220px] rounded-lg bg-white p-1">
          <svg data-testid="qr-2fa" viewBox={`0 0 ${qr.lado} ${qr.lado}`} width="100%" role="img" aria-label="QR code do 2FA" shapeRendering="crispEdges">
            <rect width={qr.lado} height={qr.lado} fill="#ffffff" />
            <path d={qr.caminho} fill="#000000" />
          </svg>
        </div>
      )}
      <a href={url} className="botao-racha botao-fantasma block w-full px-3 py-1.5 text-center text-xs">ESTÁ NO CELULAR? ABRIR NO APP AUTENTICADOR</a>
      <div className="text-xs text-[#b0a6e8]">
        Não dá para ler? No app: <b>+</b> → <b>Inserir chave de configuração</b>, nome <b>RACHA</b>, esta chave e <b>Baseada no horário</b>
        (só letras de A a Z e números de 2 a 7 — não tem 0, 1, 8 nem 9):
      </div>
      <div className="select-all rounded-lg bg-black/50 p-2 text-center font-mono text-base tracking-wider text-[#ffd23f]" data-testid="chave-2fa">{chave}</div>
      <button type="button" className="text-xs text-[#b0a6e8] underline" onClick={copia}>{copiado ? "chave copiada" : "copiar a chave"}</button>
      <details className="text-xs text-[#b0a6e8]">
        <summary className="cursor-pointer">Endereço completo (para apps que aceitam colar o link)</summary>
        <div className="mt-1 select-all break-all rounded-lg bg-black/50 p-2 font-mono text-[11px] text-[#ffd23f]">{url}</div>
      </details>
    </div>
  );
}

// v88.1: a chave (o secret do otpauth://) em grupos de 4
function chave2fa(url: string): string {
  try {
    const s = new URL(url).searchParams.get("secret") || "";
    return (s.match(/.{1,4}/g) || []).join(" ");
  } catch {
    const m = /secret=([A-Z2-7]+)/i.exec(url);
    return m ? (m[1].match(/.{1,4}/g) || []).join(" ") : url;
  }
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
