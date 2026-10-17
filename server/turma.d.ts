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
}
export class Turma {
  constructor(opcoes?: OpcoesTurma);
  conecta(ws: ConexaoWs, req: IncomingMessage & { racha?: { idPublico: string | number; nome: string } | null }): unknown;
  status(): { ok: boolean; nome: string; salas: number; online: number; chat: number; clubes: number };
  fecha(): void;
}
export function origemPermitida(origem: string | undefined, host: string | undefined, lista?: string[]): boolean;
export const MODOS: string[];
