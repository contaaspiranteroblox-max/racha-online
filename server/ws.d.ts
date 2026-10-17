// Tipos do WebSocket sem dependências (server/ws.js).
import type { IncomingMessage } from "http";
import type { Duplex } from "stream";
import type { ConexaoWs } from "./turma";
export function aceita(req: IncomingMessage, sock: Duplex, cabeca: Buffer): ConexaoWs | null;
