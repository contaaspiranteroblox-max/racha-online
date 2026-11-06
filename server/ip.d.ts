// Tipos do endereço de quem pede (server/ip.js, sem dependências) para quem o usa em TypeScript (a plataforma:
// app/api/boot.ts). v111: sem este arquivo o "tsc -b" do CI recusava o import (TS7016) e parava antes dos testes no
// navegador e do deploy.
import type { IncomingMessage } from "http";

type Texto = string | null | undefined;

/** O endereço do cliente (só valem os cabeçalhos que um proxy NOSSO acrescentou; o IPv6 pelo bloco /64). */
export function ipDe(remoto: Texto, xff?: Texto, real?: Texto, cf?: Texto): string;
/** O mesmo, a partir da requisição do Node (o socket e os cabeçalhos). */
export function ipCliente(req: IncomingMessage | null | undefined): string;
/** O pedido chegou por https? (o TLS do próprio servidor, ou o X-Forwarded-Proto de um proxy nosso) */
export function httpsDe(remoto: Texto, proto?: Texto, tls?: boolean): boolean;
export function proxyConfiavel(ip: Texto, cfg?: unknown): boolean;
export function limpaIp(ip: Texto): string;
export function chaveIp(ip: Texto): string;
export function ehCloudflare(ip: Texto): boolean;
export function dentro(ip: Texto, prefixo: string): boolean;
