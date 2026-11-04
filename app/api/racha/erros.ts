// ============================================================================
// RACHA v102 — a CHAVE REPETIDA do banco (o "Duplicate entry" do MySQL), reconhecida do jeito certo.
// O drizzle-orm da produção (0.44 em diante; o package-lock tem o 0.45) embrulha todo erro de consulta no DrizzleQueryError:
// a mensagem de cima vira "Failed query: <sql> params: <...>" e o erro do MySQL (code ER_DUP_ENTRY, errno 1062) vai para
// .cause. Até a v101 o código procurava "duplicate" só na mensagem de cima: na produção nunca achava, e o que era para ser
// "já existe, segue" virava erro — o correio, as mensagens e o resumo do lobby quebravam depois da primeira carta para
// todo mundo, e o selo do resultado online (consomeUmaVez) quebrava no segundo envio. O banco de teste agora embrulha igual
// (tests/plataforma/drizzle_lite.mjs), então os testes pegam isso.
// ============================================================================
type ErroBanco = { message?: unknown; code?: unknown; errno?: unknown; cause?: unknown };

export function ehDuplicado(e: unknown): boolean {
  for (let x = e as ErroBanco | undefined, i = 0; x && typeof x === "object" && i < 6; x = x.cause as ErroBanco | undefined, i++) {
    if (x.code === "ER_DUP_ENTRY" || x.errno === 1062 || /duplicate entry|ER_DUP_ENTRY/i.test(String(x.message ?? ""))) return true;
  }
  return false;
}
