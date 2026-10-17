// ============================================================================
// RACHA v84 — Envio de e-mail (recuperação de senha)
// O link de recuperação NUNCA vai para o cliente (spec: não revelar nada). Sem
// relay configurado, o e-mail vai para o LOG DO SERVIDOR (modo desenvolvimento)
// — assim ninguém finge que um e-mail saiu sem ele ter saído.
// Para produção, aponte RACHA_EMAIL_WEBHOOK_URL para o seu relay (um endpoint
// HTTPS que recebe {para, assunto, texto} e manda o e-mail de verdade).
// ============================================================================

export async function enviarEmail(para: string, assunto: string, texto: string): Promise<"enviado" | "registrado"> {
  const relay = process.env.RACHA_EMAIL_WEBHOOK_URL;
  if (relay && /^https:\/\//.test(relay)) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 8000);
    try {
      const r = await fetch(relay, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ para, assunto, texto }),
        signal: ctl.signal,
      });
      if (!r.ok) throw new Error("relay respondeu " + r.status);
      return "enviado";
    } finally {
      clearTimeout(t);
    }
  }
  // Sem relay: o e-mail fica no log do servidor (desenvolvimento). O jogador não vê nada.
  console.log(`[email:sem-relay] para=${para} assunto=${assunto}\n${texto}`);
  return "registrado";
}
