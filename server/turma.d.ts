// Tipos do servidor da turma (server/turma.js) para quem o monta em TypeScript (a plataforma: app/api/lib/salas.ts).
import type { IncomingMessage } from "http";
export interface ConexaoWs {
  readyState: number;
  bufferedAmount: number;
  send(texto: string): boolean;
  ping(): void;
  close(codigo?: number, motivo?: string): void;
  terminate(): void;
  on(evento: "message", fn: (texto: string) => void): this;
  on(evento: "close", fn: () => void): this;
}
export interface OpcoesTurma {
  arquivo?: string | null;
  nome?: string;
  segredo?: string;
  p2p?: boolean;
  ice?: unknown[];
  log?: (texto: string) => void;
  agora?: () => number;
  regra80?: { seg?: number; prorrog?: number };   // v80: o tempo da partida normal (padrão 180 + 120 s)
  exigeConta?: boolean;                            // v84: só entra quem tem conta (padrão: sim)
  // v88: os amigos, os bloqueios e a privacidade da conta (a plataforma lê do banco) e a denúncia do chat (vai para o banco)
  relacoesDe?: (idPublico: string) => Promise<RelacoesTurma | null>;
  denuncia?: (d: { autor: string; alvo: string; motivo: string; texto: string; canal: string; mid?: string; sala?: string }) => Promise<void>;
}
export interface RelacoesTurma { amigos: string[]; bloqueios: string[]; mostraOnline: boolean; aceitaConvites: boolean; clube: string | null; cos: Record<string, string> }
export class Turma {
  constructor(opcoes?: OpcoesTurma);
  conecta(ws: ConexaoWs, req: IncomingMessage & { racha?: { idPublico: string | number; nome: string } | null }): unknown;
  status(): { ok: boolean; nome: string; salas: number; online: number; chat: number; clubes: number };
  fecha(): void;
  avisaConta(pub: string, msg: Record<string, unknown>): boolean;              // v88: o aviso da plataforma na hora (pedido, carta, convite…)
  atualizaRelacoes(pub: string, r: RelacoesTurma | null): void;              // v88: amizade/bloqueio/privacidade mudaram
}
export function origemPermitida(origem: string | undefined, host: string | undefined, lista?: string[]): boolean;
export const MODOS: string[];
