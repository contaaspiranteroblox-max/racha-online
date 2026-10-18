// ============================================================================
// RACHA v88 — RACHA CONTROL: as abas EVENTOS e CORREIO (a parte da equipe da atualização dos menus)
// · EVENTOS: a lista (ligar/desligar), criar e editar (nome, tipo, imagem, período, regras e a configuração: os dias do
//   login, os desafios, o presente) — o jogo mostra na central de EVENTOS o que estiver ligado e dentro do período;
// · CORREIO: a carta para uma conta (pelo ID) ou para todos (com a palavra DISTRIBUIR), com moedas, gemas, um item do
//   catálogo e XP do passe — o servidor confere cada anexo e entrega uma vez quando o jogador toca em COLETAR;
// · AVISO: a mensagem do sistema (MENSAGENS › SISTEMA no jogo), para uma conta ou para todos;
// · as cartas para todos já enviadas (ligar/desligar).
// Tudo pelas rotas admin88.* (a mesma sessão do painel com 2FA, as permissões do cargo e a auditoria de cada ação).
// ============================================================================
import { useState } from "react";
import { trpc } from "@/providers/trpc";

const TIPOS_EVENTO = ["ativo", "login", "desafio", "torneio", "temporada", "temporario"] as const;
const NOME_TIPO_EVENTO: Record<string, string> = { ativo: "Evento ativo", login: "Login diário", desafio: "Desafio especial", torneio: "Torneio", temporada: "Temporada", temporario: "Recompensa temporária" };
const IMAGENS = ["favela", "quadra", "copa", "passe", "loja", "cristo", "estadio", "grafite", "noite"] as const;
const TIPOS_CARTA = ["presente", "evento", "temporada", "manutencao", "compensacao", "sistema"] as const;
const NOME_TIPO_CARTA: Record<string, string> = { presente: "Presente", evento: "Prêmio de evento", temporada: "Recompensa de temporada", manutencao: "Aviso de manutenção", compensacao: "Compensação oficial", sistema: "Sistema" };

type Evento = { id: number; slug: string; tipo: string; nome: string; descricao?: string | null; regras?: string | null; imagem?: string | null; inicio: string | Date; fim: string | Date; config?: unknown; ativo: boolean | number; ordem?: number | null };
type CartaGlobal = { id: number; tipo: string; titulo: string; anexos?: unknown; inicio: string | Date; fim: string | Date; ativo?: boolean | number | null };

// a data no formato do campo datetime-local (no horário do aparelho) e de volta em ISO (o servidor guarda em UTC)
function paraCampo(d: string | Date): string {
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}T${p(t.getHours())}:${p(t.getMinutes())}`;
}
function doCampo(s: string): string | null {
  const t = new Date(s);
  return Number.isNaN(t.getTime()) ? null : t.toISOString();
}
const dataCurta = (d: string | Date) => new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

function Aviso({ msg }: { msg: string }) {
  if (!msg) return null;
  return <div className="mt-3 rounded-xl border-2 border-[#7048e8] bg-[#7048e8]/15 px-3 py-2 text-sm text-[#d0bfff]">{msg}</div>;
}
function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs tracking-widest text-[#b0a6e8]">{rotulo}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

// ============================================================================
// ABA EVENTOS
// ============================================================================
const FORM_VAZIO = { id: 0, slug: "", tipo: "ativo" as string, nome: "", descricao: "", regras: "", imagem: "favela" as string, inicio: "", fim: "", ativo: true, ordem: 10, config: "{}" };

export function AbaEventos() {
  const lista = trpc.admin88.eventosListar.useQuery();
  const [f, setF] = useState({ ...FORM_VAZIO });
  const [msg, setMsg] = useState("");
  const salvar = trpc.admin88.eventoSalvar.useMutation({
    onSuccess: (r) => { setMsg(`Evento salvo (#${r.id}).`); setF({ ...FORM_VAZIO }); lista.refetch(); },
    onError: (e) => setMsg(e.message),
  });
  const ligar = trpc.admin88.eventoAtivo.useMutation({ onSuccess: () => lista.refetch(), onError: (e) => setMsg(e.message) });
  const muda = (k: keyof typeof FORM_VAZIO, v: string | boolean | number) => setF((o) => ({ ...o, [k]: v }));

  function editar(ev: Evento) {
    setMsg("");
    setF({
      id: ev.id, slug: ev.slug, tipo: ev.tipo, nome: ev.nome, descricao: ev.descricao ?? "", regras: ev.regras ?? "", imagem: ev.imagem ?? "favela",
      inicio: paraCampo(ev.inicio), fim: paraCampo(ev.fim), ativo: !!ev.ativo, ordem: Number(ev.ordem ?? 0), config: JSON.stringify(ev.config ?? {}, null, 1),
    });
  }
  function enviar() {
    setMsg("");
    const inicio = doCampo(f.inicio), fim = doCampo(f.fim);
    if (!inicio || !fim) return setMsg("Escolha o começo e o fim do evento.");
    let config: Record<string, unknown> = {};
    try {
      const c = JSON.parse(f.config || "{}");
      if (!c || typeof c !== "object" || Array.isArray(c)) throw new Error("x");
      config = c as Record<string, unknown>;
    } catch {
      return setMsg("A configuração precisa ser um objeto JSON (ex.: {} ou {\"acao\":\"copa\"}).");
    }
    salvar.mutate({
      id: f.id || undefined, slug: f.slug.trim(), tipo: f.tipo as (typeof TIPOS_EVENTO)[number], nome: f.nome.trim(), descricao: f.descricao, regras: f.regras,
      imagem: f.imagem as (typeof IMAGENS)[number], inicio, fim, config, ativo: f.ativo, ordem: Math.max(0, Math.min(999, Math.round(Number(f.ordem) || 0))),
    });
  }

  const eventos = (lista.data ?? []) as Evento[];
  return (
    <div className="space-y-4">
      <div className="cartao-rua p-5">
        <h3 className="texto-pixo text-xl">EVENTOS</h3>
        <p className="mt-1 text-xs text-[#b0a6e8]">O jogo mostra na central de EVENTOS os que estão ligados e dentro do período. Os padrões (login diário, desafio, copa, temporada) entram sozinhos.</p>
        <div className="mt-3 space-y-1.5">
          {lista.isLoading && <p className="text-sm text-[#b0a6e8]">Carregando…</p>}
          {lista.error && <p className="text-sm text-[#ffb4a8]">{lista.error.message}</p>}
          {!lista.isLoading && !eventos.length && !lista.error && <p className="text-sm text-[#b0a6e8]">Nenhum evento.</p>}
          {eventos.map((ev) => (
            <div key={ev.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-[#33286b] bg-black/30 px-3 py-2 text-xs">
              <span className={`rounded-md px-2 py-0.5 ${ev.ativo ? "bg-[#2b8a3e]" : "bg-[#495057]"}`}>{ev.ativo ? "LIGADO" : "DESLIGADO"}</span>
              <span className="rounded-md bg-[#5f3dc4] px-2 py-0.5">{NOME_TIPO_EVENTO[ev.tipo] ?? ev.tipo}</span>
              <b className="flex-1">{ev.nome}</b>
              <span className="text-[#6f6699]">{dataCurta(ev.inicio)} → {dataCurta(ev.fim)}</span>
              <button className="botao-racha botao-fantasma px-2.5 py-1 text-xs" onClick={() => editar(ev)}>EDITAR</button>
              <button className="botao-racha botao-fantasma px-2.5 py-1 text-xs" disabled={ligar.isPending} onClick={() => ligar.mutate({ id: ev.id, ativo: !ev.ativo })}>
                {ev.ativo ? "DESLIGAR" : "LIGAR"}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="cartao-rua p-5">
        <h3 className="texto-pixo text-xl">{f.id ? `EDITAR EVENTO #${f.id}` : "NOVO EVENTO"}</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Campo rotulo="NOME"><input className="input-racha" value={f.nome} maxLength={60} onChange={(e) => muda("nome", e.target.value)} placeholder="SEMANA DO GOL" /></Campo>
          <Campo rotulo="SLUG (letras minúsculas, números e hífen)"><input className="input-racha" value={f.slug} maxLength={40} onChange={(e) => muda("slug", e.target.value.toLowerCase())} placeholder="semana-do-gol" /></Campo>
          <Campo rotulo="TIPO">
            <select className="input-racha" value={f.tipo} onChange={(e) => muda("tipo", e.target.value)}>
              {TIPOS_EVENTO.map((t) => <option key={t} value={t}>{NOME_TIPO_EVENTO[t]}</option>)}
            </select>
          </Campo>
          <Campo rotulo="IMAGEM">
            <select className="input-racha" value={f.imagem} onChange={(e) => muda("imagem", e.target.value)}>
              {IMAGENS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Campo>
          <Campo rotulo="COMEÇA"><input className="input-racha" type="datetime-local" value={f.inicio} onChange={(e) => muda("inicio", e.target.value)} /></Campo>
          <Campo rotulo="TERMINA"><input className="input-racha" type="datetime-local" value={f.fim} onChange={(e) => muda("fim", e.target.value)} /></Campo>
        </div>
        <div className="mt-3 space-y-3">
          <Campo rotulo="DESCRIÇÃO"><textarea className="input-racha min-h-16" value={f.descricao} maxLength={300} onChange={(e) => muda("descricao", e.target.value)} /></Campo>
          <Campo rotulo="REGRAS"><textarea className="input-racha min-h-16" value={f.regras} maxLength={1000} onChange={(e) => muda("regras", e.target.value)} /></Campo>
          <Campo rotulo='CONFIGURAÇÃO (JSON) — login: {"dias":[{"moedas":200},{"gemas":5}]} · desafio: {"missoes":[{"id":"g10","nome":"Marque 10 gols","tipo":"gols","meta":10,"premio":{"moedas":500}}]} · presente: {"presente":[{"tipo":"moedas","qtd":1000}]}'>
            <textarea className="input-racha min-h-24 font-mono text-xs" value={f.config} onChange={(e) => muda("config", e.target.value)} />
          </Campo>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={f.ativo} onChange={(e) => muda("ativo", e.target.checked)} /> Ligado</label>
            <label className="flex items-center gap-2">Ordem <input className="input-racha w-24" type="number" min={0} max={999} value={f.ordem} onChange={(e) => muda("ordem", Number(e.target.value))} /></label>
          </div>
        </div>
        <Aviso msg={msg} />
        <div className="mt-4 flex gap-2">
          <button className="botao-racha botao-verde flex-1 px-4 py-3" disabled={salvar.isPending || !f.nome.trim() || !f.slug.trim()} onClick={enviar}>
            {salvar.isPending ? "SALVANDO..." : f.id ? "SALVAR O EVENTO" : "CRIAR O EVENTO"}
          </button>
          {f.id ? <button className="botao-racha botao-fantasma px-4 py-3" onClick={() => { setF({ ...FORM_VAZIO }); setMsg(""); }}>CANCELAR</button> : null}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ABA CORREIO (e os avisos do sistema)
// ============================================================================
export function AbaCorreio({ tem }: { tem: (p: string) => boolean }) {
  const [para, setPara] = useState("");
  const [tipo, setTipo] = useState<string>("presente");
  const [titulo, setTitulo] = useState("");
  const [corpo, setCorpo] = useState("");
  const [moedas, setMoedas] = useState(0);
  const [gemas, setGemas] = useState(0);
  const [item, setItem] = useState("");
  const [xp, setXp] = useState(0);
  const [dias, setDias] = useState(14);
  const [conf, setConf] = useState("");
  const [msg, setMsg] = useState("");
  const [avisoPara, setAvisoPara] = useState("");
  const [avisoTit, setAvisoTit] = useState("");
  const [avisoCorpo, setAvisoCorpo] = useState("");
  const [msgAviso, setMsgAviso] = useState("");
  const podeGlobal = tem("distribuir_global");
  const podeAviso = tem("gerenciar_eventos");
  const globais = trpc.admin88.correioGlobalListar.useQuery();
  const enviar = trpc.admin88.correioEnviar.useMutation({
    onSuccess: (r) => { setMsg(r.global ? `Carta para todos criada (#${"id" in r ? r.id : "?"}): cada conta recebe a sua ao abrir o jogo.` : "Carta enviada para a conta."); setConf(""); globais.refetch(); },
    onError: (e) => setMsg(e.message),
  });
  const ligar = trpc.admin88.correioGlobalAtivo.useMutation({ onSuccess: () => globais.refetch(), onError: (e) => setMsg(e.message) });
  const avisar = trpc.admin88.aviso.useMutation({
    onSuccess: (r) => { setMsgAviso(r.global ? "Aviso para todos criado." : "Aviso enviado para a conta."); setAvisoTit(""); setAvisoCorpo(""); },
    onError: (e) => setMsgAviso(e.message),
  });

  const todos = para.trim().toLowerCase() === "todos";
  const anexos: { tipo: "moedas" | "gemas" | "item" | "xp_passe"; qtd: number; codigo?: string }[] = [];
  if (moedas > 0) anexos.push({ tipo: "moedas", qtd: Math.round(moedas) });
  if (gemas > 0) anexos.push({ tipo: "gemas", qtd: Math.round(gemas) });
  if (item.trim()) anexos.push({ tipo: "item", qtd: 1, codigo: item.trim() });
  if (xp > 0) anexos.push({ tipo: "xp_passe", qtd: Math.round(xp) });
  const paraOk = todos || /^\d{1,9}$/.test(para.trim());

  return (
    <div className="space-y-4">
      <div className="cartao-rua p-5">
        <h3 className="texto-pixo text-xl">ENVIAR CARTA</h3>
        <p className="mt-1 text-xs text-[#b0a6e8]">A carta chega no CORREIO do jogo; o prêmio só entra na conta quando o jogador toca em COLETAR (uma vez, conferido no servidor).</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Campo rotulo="PARA (ID da conta ou todos)"><input className="input-racha" value={para} onChange={(e) => setPara(e.target.value)} placeholder="000123 ou todos" /></Campo>
          <Campo rotulo="TIPO">
            <select className="input-racha" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              {TIPOS_CARTA.map((t) => <option key={t} value={t}>{NOME_TIPO_CARTA[t]}</option>)}
            </select>
          </Campo>
        </div>
        <div className="mt-3 space-y-3">
          <Campo rotulo="TÍTULO"><input className="input-racha" value={titulo} maxLength={80} onChange={(e) => setTitulo(e.target.value)} placeholder="Compensação pela manutenção" /></Campo>
          <Campo rotulo="TEXTO"><textarea className="input-racha min-h-16" value={corpo} maxLength={600} onChange={(e) => setCorpo(e.target.value)} /></Campo>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <Campo rotulo="MOEDAS"><input className="input-racha" type="number" min={0} value={moedas} onChange={(e) => setMoedas(Number(e.target.value))} /></Campo>
          <Campo rotulo="GEMAS"><input className="input-racha" type="number" min={0} value={gemas} onChange={(e) => setGemas(Number(e.target.value))} /></Campo>
          <Campo rotulo="ITEM (código)"><input className="input-racha" value={item} maxLength={40} onChange={(e) => setItem(e.target.value)} placeholder="av_10" /></Campo>
          <Campo rotulo="XP DO PASSE"><input className="input-racha" type="number" min={0} value={xp} onChange={(e) => setXp(Number(e.target.value))} /></Campo>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Campo rotulo="VALE POR (dias)"><input className="input-racha" type="number" min={1} max={90} value={dias} onChange={(e) => setDias(Number(e.target.value))} /></Campo>
          {todos && (
            <Campo rotulo="PARA TODOS: escreva DISTRIBUIR">
              <input className="input-racha" value={conf} onChange={(e) => setConf(e.target.value)} placeholder="DISTRIBUIR" disabled={!podeGlobal} />
            </Campo>
          )}
        </div>
        {todos && !podeGlobal && <div className="mt-2 text-sm text-[#ffb4a8]">Seu cargo não tem a permissão "distribuir_global".</div>}
        <Aviso msg={msg} />
        <button
          className="botao-racha botao-verde mt-4 w-full px-4 py-3"
          disabled={enviar.isPending || !paraOk || titulo.trim().length < 3 || (todos && (!podeGlobal || conf !== "DISTRIBUIR"))}
          onClick={() => {
            setMsg("");
            enviar.mutate({
              para: todos ? "todos" : para.trim(), tipo: tipo as (typeof TIPOS_CARTA)[number], titulo: titulo.trim(), corpo,
              anexos, dias: Math.max(1, Math.min(90, Math.round(dias) || 14)), confirmacao: todos ? conf : undefined,
            });
          }}
        >
          {enviar.isPending ? "ENVIANDO..." : todos ? "ENVIAR PARA TODOS" : "ENVIAR A CARTA"}
        </button>
      </div>

      <div className="cartao-rua p-5">
        <h3 className="texto-pixo text-xl">CARTAS PARA TODOS</h3>
        <div className="mt-3 space-y-1.5">
          {globais.error && <p className="text-sm text-[#ffb4a8]">{globais.error.message}</p>}
          {!globais.error && !(globais.data ?? []).length && <p className="text-sm text-[#b0a6e8]">Nenhuma carta para todos ainda.</p>}
          {((globais.data ?? []) as CartaGlobal[]).map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-[#33286b] bg-black/30 px-3 py-2 text-xs">
              <span className={`rounded-md px-2 py-0.5 ${c.ativo === false || c.ativo === 0 ? "bg-[#495057]" : "bg-[#2b8a3e]"}`}>{c.ativo === false || c.ativo === 0 ? "DESLIGADA" : "LIGADA"}</span>
              <span className="rounded-md bg-[#5f3dc4] px-2 py-0.5">{NOME_TIPO_CARTA[c.tipo] ?? c.tipo}</span>
              <b className="flex-1">{c.titulo}</b>
              <span className="text-[#6f6699]">até {dataCurta(c.fim)}</span>
              {podeGlobal && (
                <button className="botao-racha botao-fantasma px-2.5 py-1 text-xs" disabled={ligar.isPending} onClick={() => ligar.mutate({ id: c.id, ativo: c.ativo === false || c.ativo === 0 })}>
                  {c.ativo === false || c.ativo === 0 ? "LIGAR" : "DESLIGAR"}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {podeAviso && (
        <div className="cartao-rua p-5">
          <h3 className="texto-pixo text-xl">AVISO DO SISTEMA</h3>
          <p className="mt-1 text-xs text-[#b0a6e8]">Aparece em MENSAGENS › SISTEMA no jogo (sem prêmio).</p>
          <div className="mt-3 space-y-3">
            <Campo rotulo="PARA (ID da conta ou todos)"><input className="input-racha" value={avisoPara} onChange={(e) => setAvisoPara(e.target.value)} placeholder="000123 ou todos" /></Campo>
            <Campo rotulo="TÍTULO"><input className="input-racha" value={avisoTit} maxLength={80} onChange={(e) => setAvisoTit(e.target.value)} placeholder="Manutenção hoje às 22h" /></Campo>
            <Campo rotulo="TEXTO"><textarea className="input-racha min-h-16" value={avisoCorpo} maxLength={600} onChange={(e) => setAvisoCorpo(e.target.value)} /></Campo>
          </div>
          <Aviso msg={msgAviso} />
          <button
            className="botao-racha botao-verde mt-4 w-full px-4 py-3"
            disabled={avisar.isPending || !(avisoPara.trim().toLowerCase() === "todos" || /^\d{1,9}$/.test(avisoPara.trim())) || avisoTit.trim().length < 3}
            onClick={() => { setMsgAviso(""); avisar.mutate({ para: avisoPara.trim().toLowerCase() === "todos" ? "todos" : avisoPara.trim(), titulo: avisoTit.trim(), corpo: avisoCorpo }); }}
          >
            {avisar.isPending ? "ENVIANDO..." : "ENVIAR O AVISO"}
          </button>
        </div>
      )}
    </div>
  );
}
