// ============================================================================
// RACHA v82 — O PROGRESSO DO JOGO NA CONTA (o "save na nuvem")
// O jogo guarda o progresso no aparelho (localStorage); com a conta, ele manda uma cópia das chaves de progresso para
// a plataforma e, em outro aparelho, começa de onde parou. Só vão estas chaves (as configurações do aparelho — som,
// câmera, controles, teclas, o endereço do servidor, os replays — ficam no aparelho).
// O servidor guarda a cópia com um número de versão: quem salva diz de qual versão partiu; se outro aparelho salvou
// antes (a versão mudou), volta "conflito" com a cópia nova e o jogo pergunta qual fica.
// Moedas, gemas e peças são cosméticos: o servidor confere o formato e o tamanho, não cada compra (ver LEIA-ME). A
// patente e o nível da conta NÃO vêm daqui: ficam nas tabelas próprias (ranqueada, usuarios), calculados no servidor.
// Sem imports: roda no servidor, no site e nos testes.
// ============================================================================

export const PROGRESSO_VERSAO = 1;

export const PROGRESSO_CHAVES = [
  "streetball-conta-v1", // moedas, gemas, peças da loja, missões, Top semanal, o XP do aparelho, a patente (cópia)
  "racha-treino-perfil-v1", // nome, tampinha, avatar, bio, títulos e estatísticas
  "streetball-v49", // histórico das 30 últimas partidas, sequências e recordes das partidas
  "racha-tampa-v1", // as peças compradas da tampinha, os desenhos salvos e a equipada
  "racha-tampa-rascunho-v1", // o rascunho do editor
  "racha-clubes-v1", // o clube deste aparelho (sem conta)
  "streetball-treino-v1", // as estrelas dos exercícios
  "streetball-recordes-v1", // os recordes dos treinos
  "racha-v71-padrao", // (as trocas da tampinha padrão já feitas)
  "racha-v80-padrao",
] as const;

export const PROGRESSO_MAX_BYTES = 256 * 1024; // a cópia inteira
export const PROGRESSO_MAX_CHAVE = 160 * 1024; // cada chave

export type DadosProgresso = { v: number; chaves: Record<string, string> };

export type ValidacaoProgresso = { ok: true; dados: DadosProgresso; bytes: number } | { ok: false; erro: string };

function bytesDe(s: string): number {
  return new TextEncoder().encode(s).length;
}

export function validaProgresso(x: unknown): ValidacaoProgresso {
  if (!x || typeof x !== "object" || Array.isArray(x)) return { ok: false, erro: "Cópia do progresso inválida." };
  const o = x as Record<string, unknown>;
  if (o.v !== PROGRESSO_VERSAO) return { ok: false, erro: "Versão da cópia do progresso desconhecida." };
  const ch = o.chaves;
  if (!ch || typeof ch !== "object" || Array.isArray(ch)) return { ok: false, erro: "Cópia do progresso sem as chaves." };
  const permitidas = new Set<string>(PROGRESSO_CHAVES);
  const limpas: Record<string, string> = {};
  for (const [k, v] of Object.entries(ch as Record<string, unknown>)) {
    if (!permitidas.has(k)) return { ok: false, erro: "Chave fora do progresso: " + k.slice(0, 40) };
    if (typeof v !== "string") return { ok: false, erro: "Valor inválido na chave " + k };
    if (bytesDe(v) > PROGRESSO_MAX_CHAVE) return { ok: false, erro: "A chave " + k + " passou do tamanho." };
    limpas[k] = v;
  }
  const dados: DadosProgresso = { v: PROGRESSO_VERSAO, chaves: limpas };
  const bytes = bytesDe(JSON.stringify(dados));
  if (bytes > PROGRESSO_MAX_BYTES) return { ok: false, erro: "O progresso passou do tamanho (" + Math.round(bytes / 1024) + " KB)." };
  return { ok: true, dados, bytes };
}
