// ============================================================================
// RACHA 2.0 — Segurança: senhas (scrypt), tokens de sessão, TOTP (2FA admin)
// Nada de senha em texto puro. Tokens são guardados apenas como hash SHA-256.
// ============================================================================
import { createHash, randomBytes, scryptSync, timingSafeEqual, createHmac } from "node:crypto";

// ---------- Senhas ----------
export function hashSenha(senha: string): string {
  const sal = randomBytes(16).toString("hex");
  const hash = scryptSync(senha, sal, 64).toString("hex");
  return `scrypt:${sal}:${hash}`;
}

export function verificarSenha(senha: string, armazenado: string): boolean {
  try {
    const [alg, sal, hash] = armazenado.split(":");
    if (alg !== "scrypt" || !sal || !hash) return false;
    const calc = scryptSync(senha, sal, 64);
    const ref = Buffer.from(hash, "hex");
    return calc.length === ref.length && timingSafeEqual(calc, ref);
  } catch {
    return false;
  }
}

// ---------- Tokens ----------
export function novoToken(): string {
  return randomBytes(32).toString("base64url");
}

export function sha256(txt: string): string {
  return createHash("sha256").update(txt).digest("hex");
}

export function novoUuid(): string {
  return crypto.randomUUID();
}

// ---------- TOTP (RFC 6238, HMAC-SHA1, 30 s) — 2FA do painel admin ----------
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function gerarSegredoTotp(): string {
  const bytes = randomBytes(20);
  let out = "";
  for (const b of bytes) out += B32[b % 32];
  return out;
}

function b32dec(s: string): Buffer {
  let bits = 0, valor = 0;
  const out: number[] = [];
  for (const c of s.toUpperCase().replace(/=+$/, "")) {
    const i = B32.indexOf(c);
    if (i < 0) continue;
    valor = (valor << 5) | i;
    bits += 5;
    if (bits >= 8) {
      out.push((valor >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

function totpCodigo(segredo: string, passo: number): string {
  const chave = b32dec(segredo);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(passo));
  const h = createHmac("sha1", chave).update(buf).digest();
  const off = h[h.length - 1] & 0xf;
  const cod = ((h[off] & 0x7f) << 24) | (h[off + 1] << 16) | (h[off + 2] << 8) | h[off + 3];
  return String(cod % 1_000_000).padStart(6, "0");
}

export function verificarTotp(segredo: string, codigo: string): boolean {
  const passo = Math.floor(Date.now() / 1000 / 30);
  const limpo = codigo.replace(/\s/g, "");
  for (const d of [-1, 0, 1]) {
    // janela de ±1 passo (tolerância de relógio)
    if (totpCodigo(segredo, passo + d) === limpo) return true;
  }
  return false;
}

export function urlTotp(segredo: string, usuario: string): string {
  const rotulo = encodeURIComponent(`RACHA CONTROL:${usuario}`);
  return `otpauth://totp/${rotulo}?secret=${segredo}&issuer=RACHA&digits=6&period=30`;
}

// ---------- Código de recuperação de conta ----------
export function novoCodigoRecuperacao(): string {
  // formato RACHA-XXXX-XXXX-XXXX (fácil de anotar)
  const p = () => randomBytes(2).toString("hex").toUpperCase();
  return `RACHA-${p()}-${p()}-${p()}`;
}
