// ============================================================================
// RACHA 2.0 — v70: o SERVIDOR DA TURMA montado na plataforma (o mesmo endereço do site).
// As salas online, o Chat do Brasil, os clubes da turma e a copa (server/turma.js, sem dependências) passam a
// responder no WebSocket do próprio site: o jogo aberto pela plataforma conecta sozinho (ws(s)://o-mesmo-endereço/).
//   · quem está logado entra com a conta (a sessão do site é conferida aqui, antes do aperto de mão);
//   · a origem é conferida: o próprio site, localhost e as de RACHA_ORIGENS (separadas por vírgula);
//   · o resultado que o servidor conferiu sai com o selo (assinado com o segredo das salas), que o
//     jogo.encerrarPartida confere antes de dar XP da partida online.
// Desligar: RACHA_SALAS=0. Guardar os troféus/clubes da turma: RACHA_DADOS=/caminho/turma.json (padrão: memória).
// ============================================================================
import type { IncomingMessage, Server } from "http";
import type { Duplex } from "stream";
import { Turma, origemPermitida } from "../../../server/turma.js";
import { aceita } from "../../../server/ws.js";
import { sessaoDaRequisicao } from "../racha/guard";
import { garanteSegredoSalas } from "./selo";

function cabecalhos(req: IncomingMessage): Headers {
  const h = new Headers();
  for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string") h.set(k, v);
  return h;
}

// v79: selosDe (passado pelo boot, que tem o banco) devolve os selos da conta — o V na frente do nome nas salas e no Chat do
// Brasil sai do banco, nunca do jogo. Sem ele (os testes), ninguém aparece com selo.
// v88: relacoesDe (os amigos, os bloqueios e a privacidade da conta, do banco) e denuncia (a denúncia de uma mensagem do chat
// vai para a tabela denuncias, a mesma do RACHA CONTROL). Sem eles (os testes antigos), o servidor das salas usa o que vem
// assinado no bilhete e guarda as denúncias só na memória.
export type RelacoesConta = { amigos: string[]; bloqueios: string[]; mostraOnline: boolean; aceitaConvites: boolean; clube: string | null; cos: Record<string, string> };
export type DenunciaChat = { autor: string; alvo: string; motivo: string; texto: string; canal: string; mid?: string; sala?: string };
export type OpcoesSalas = {
  selosDe?: (usuarioId: number) => Promise<string[]>;
  relacoesDe?: (idPublico: string) => Promise<RelacoesConta | null>;
  denuncia?: (d: DenunciaChat) => Promise<void>;
};
// v88: a turma montada aqui (a plataforma avisa na hora: pedido de amizade, convite de clube, carta nova, amizade desfeita…)
let turmaAtual: Turma | null = null;
type TurmaV88 = Turma & {
  avisaConta?: (pub: string, m: Record<string, unknown>) => boolean;
  atualizaRelacoes?: (pub: string, r: RelacoesConta | null) => void;
  v88ZeraContas?: (manter: string[], em: number) => { caiu: number }; // v88.1
  b?: { d?: { zeradoEm?: number } };
};
export function avisaConta(idPublico: number | string, msg: Record<string, unknown>): boolean {
  try { return !!(turmaAtual as TurmaV88 | null)?.avisaConta?.(String(idPublico).padStart(6, "0"), msg); } catch (_) { return false; }
}
export function relacoesMudaram(idPublico: number | string, r: RelacoesConta | null): void {
  try { (turmaAtual as TurmaV88 | null)?.atualizaRelacoes?.(String(idPublico).padStart(6, "0"), r); } catch (_) { /* sem a turma aqui */ }
}
// v88.1: o Dono zerou as contas (RACHA CONTROL › Contas): o servidor das salas montado aqui esquece as contas apagadas (os
// números voltam a ser usados) e passa a recusar o bilhete assinado antes disso. `manter`: os números que continuam.
export function contasZeradas(manter: string[], em: number): number {
  try { return (turmaAtual as TurmaV88 | null)?.v88ZeraContas?.(manter, em)?.caiu ?? 0; } catch (_) { return 0; }
}
// v88.1: no boot, quando as contas foram zeradas (do banco). Se este servidor das salas não viu o zerar (estava desligado,
// ou é outro processo com o arquivo de RACHA_DADOS), ele esquece agora o que era das contas apagadas — e o bilhete de antes
// não vale nem depois de reiniciar.
export function marcaContasZeradas(em: number | null, manter: string[] = ["000001"]): void {
  const t = turmaAtual as TurmaV88 | null;
  const d = t?.b?.d;
  if (!t || !d || !em || em <= (d.zeradoEm || 0)) return;
  if (t.v88ZeraContas) { try { t.v88ZeraContas(manter, em); return; } catch (_) { /* (segue para só marcar a hora) */ } }
  d.zeradoEm = em;
}
export function ligaSalas(servidor: Server, opcoes: OpcoesSalas = {}): Turma {
  const turma = new Turma({
    arquivo: process.env.RACHA_DADOS || null,
    nome: process.env.RACHA_SALAS_NOME || "RACHA",
    segredo: garanteSegredoSalas(),
    p2p: process.env.RACHA_P2P !== "0",
    relacoesDe: opcoes.relacoesDe,
    denuncia: opcoes.denuncia,
  } as ConstructorParameters<typeof Turma>[0]);
  turmaAtual = turma;
  const origens = (process.env.RACHA_ORIGENS || "").split(",").map((s) => s.trim()).filter(Boolean);
  servidor.on("upgrade", (req: IncomingMessage, sock: Duplex, cabeca: Buffer) => {
    if (!origemPermitida(req.headers.origin, req.headers.host, origens)) {
      sock.end("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
      return;
    }
    // a conta da sessão do site (o cookie vai junto no aperto de mão do mesmo endereço)
    sessaoDaRequisicao(new Request("http://racha.local/", { headers: cabecalhos(req) }))
      .catch(() => null)
      .then(async (s) => {
        const usuario = s?.usuario as { id?: number; idPublico: number; nomeExibicao: string } | undefined;
        const lista = usuario && typeof usuario.id === "number" && opcoes.selosDe ? await opcoes.selosDe(usuario.id).catch(() => []) : [];
        // v88: os amigos, os bloqueios e a privacidade da conta já vão junto (o servidor das salas não precisa perguntar depois)
        const rel = usuario && opcoes.relacoesDe ? await opcoes.relacoesDe(String(usuario.idPublico).padStart(6, "0")).catch(() => null) : null;
        const ws = aceita(req, sock, cabeca);
        if (!ws) return;
        const r = req as IncomingMessage & { racha?: { idPublico: number; nome: string; selos: string[]; rel: RelacoesConta | null } | null };
        r.racha = usuario ? { idPublico: usuario.idPublico, nome: usuario.nomeExibicao, selos: lista, rel } : null;
        turma.conecta(ws, r);
      });
  });
  const desliga = () => turma.fecha();
  process.once("SIGTERM", desliga);
  process.once("SIGINT", desliga);
  return turma;
}
