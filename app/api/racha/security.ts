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

// v109: a chave é a codificação base32 de verdade de 20 bytes (160 bits, o tamanho do RFC 4226): 32 letras, sem sobra. Antes
// eram 20 letras sorteadas (20 bytes, cada um virando UMA letra): 100 bits, que não fecham em bytes — os 4 bits do fim sobravam,
// e um app autenticador mais rígido recusava a chave ("chave inválida") ou chegava num código diferente do servidor.
export function base32(bytes: Uint8Array): string {
  let bits = 0, valor = 0, out = "";
  for (const b of bytes) {
    valor = (valor << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += B32[(valor >>> (bits - 5)) & 31];
      bits -= 5;
    }
    valor &= (1 << bits) - 1;
  }
  if (bits > 0) out += B32[(valor << (5 - bits)) & 31];
  return out;
}

export function gerarSegredoTotp(): string {
  return base32(randomBytes(20));
}

// v109: a chave no formato de agora (32 letras do alfabeto base32)? As de antes (20 letras) continuam valendo para quem já
// confirmou o 2FA com elas; quem ainda não confirmou ganha uma chave nova no próximo login do painel.
export function segredoTotpAtual(s: string): boolean {
  return /^[A-Z2-7]{32}$/.test(s);
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

export function passoTotp(agora = Date.now()): number {
  return Math.floor(agora / 1000 / 30);
}

export function verificarTotp(segredo: string, codigo: string): boolean {
  const d = desvioTotp(segredo, codigo, 1);
  return d !== null; // janela de ±1 passo (tolerância de relógio)
}

// v109: em que passo (contado a partir do de agora) o código bate — o mais perto primeiro: 0, -1, +1, -2, +2... até `janela`.
// null: não bate em nenhum. Com a janela grande (15 min), o painel avisa quando o código é de outro horário: o relógio do
// celular (ou o do servidor) está adiantado ou atrasado — o "código errado" que não era erro de digitação.
export function desvioTotp(segredo: string, codigo: string, janela: number, agora = Date.now()): number | null {
  const limpo = String(codigo).replace(/\s/g, "");
  if (!/^\d{6}$/.test(limpo)) return null;
  const passo = passoTotp(agora);
  for (let k = 0; k <= janela; k++) {
    for (const d of k === 0 ? [0] : [-k, k]) {
      if (totpCodigo(segredo, passo + d) === limpo) return d;
    }
  }
  return null;
}

// v109: o rótulo curto (o QR code fica menor e mais fácil de ler): o app mostra "RACHA (usuario)"
export function urlTotp(segredo: string, usuario: string): string {
  const rotulo = encodeURIComponent(`RACHA:${usuario}`);
  return `otpauth://totp/${rotulo}?secret=${segredo}&issuer=RACHA&algorithm=SHA1&digits=6&period=30`;
}

// ---------- Código de recuperação de conta ----------
export function novoCodigoRecuperacao(): string {
  // formato RACHA-XXXX-XXXX-XXXX (fácil de anotar)
  const p = () => randomBytes(2).toString("hex").toUpperCase();
  return `RACHA-${p()}-${p()}-${p()}`;
}
