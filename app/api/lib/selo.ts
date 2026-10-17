// ============================================================================
// RACHA 2.0 — v70: o bilhete da conta e o selo do resultado online.
// O mesmo formato do servidor da turma (server/banco.js): base64url(JSON) + "." + base64url(HMAC-SHA256).
//   · bilhete: a plataforma assina {p: ID público, n: nome, e: validade}; o jogo manda no hello e o servidor da turma
//     reconhece a conta (quando ele é montado aqui mesmo, ele usa a sessão do site direto).
//   · selo: o servidor da turma assina o resultado que ele conferiu ({s: sala, r: rodada, j: ID público, l: lado,
//     p: [nosso, deles], m: modo, d: duração, t: quando, e: validade; v82: k: 1 na ranqueada, n: o tamanho do time});
//     a plataforma confere antes de dar XP online (e, na ranqueada, antes de mexer na patente da conta).
// O segredo: RACHA_SEGREDO_SALAS (o mesmo nos dois lados). Montado na plataforma sem a variável, um segredo novo é
// sorteado a cada vez que o servidor sobe (os dois lados estão no mesmo processo).
// ============================================================================
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const b64u = (b: Buffer | string) => Buffer.from(b).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const deB64u = (s: string) => Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");

let segredoAqui = process.env.RACHA_SEGREDO_SALAS ?? "";
export function segredoSalas(): string {
  return segredoAqui;
}
export function garanteSegredoSalas(): string {
  if (!segredoAqui) segredoAqui = b64u(randomBytes(32));
  return segredoAqui;
}

export function assina(segredo: string, obj: Record<string, unknown>): string {
  const corpo = b64u(JSON.stringify(obj));
  return corpo + "." + b64u(createHmac("sha256", segredo).update(corpo).digest());
}

export function confere(segredo: string, txt: unknown, agora = Date.now()): Record<string, unknown> | null {
  if (!segredo || typeof txt !== "string" || txt.length > 600) return null;
  const i = txt.indexOf(".");
  if (i < 1) return null;
  const corpo = txt.slice(0, i);
  const sig = deB64u(txt.slice(i + 1));
  const certo = createHmac("sha256", segredo).update(corpo).digest();
  if (sig.length !== certo.length || !timingSafeEqual(sig, certo)) return null;
  let o: unknown;
  try {
    o = JSON.parse(deB64u(corpo).toString("utf8"));
  } catch {
    return null;
  }
  if (!o || typeof o !== "object") return null;
  const r = o as Record<string, unknown>;
  if (typeof r.e === "number" && r.e < agora) return null;
  return r;
}

export type Selo = { s: string; r: number; j: string; l: 0 | 1; p: [number, number]; m: string; d: number; t: number; e: number; k?: 0 | 1; n?: number }; // v82: k = ranqueada, n = o tamanho do time

export function confereSelo(txt: unknown): Selo | null {
  const o = confere(segredoSalas(), txt);
  if (!o) return null;
  const p = o.p as unknown;
  if (
    typeof o.s !== "string" || typeof o.r !== "number" || typeof o.j !== "string" || (o.l !== 0 && o.l !== 1) ||
    !Array.isArray(p) || p.length !== 2 || !p.every((v) => Number.isInteger(v) && v >= 0) ||
    typeof o.m !== "string" || typeof o.d !== "number" || typeof o.t !== "number"
  )
    return null;
  return o as unknown as Selo;
}

// v79: o bilhete leva também os selos da conta (s: verificado, parceiro, equipe, criador), assinados — o servidor da turma
// só mostra o V na frente do nome de quem chega com eles daqui (o jogo não consegue inventar um selo).
export function bilheteDaConta(idPublico: number, nome: string, selos: string[] = []): string | null {
  const seg = segredoSalas();
  if (!seg) return null;
  const s = selos.filter((x) => ["verificado", "criador", "parceiro", "equipe"].includes(x));
  return assina(seg, { p: String(idPublico), n: nome, ...(s.length ? { s } : {}), e: Date.now() + 30 * 60 * 1000 });
}
