// ============================================================================
// RACHA v88 — as regras novas, sem banco (o servidor usa; os testes conferem direto):
//   · o catálogo (app/contracts/catalogo88.json — o MESMO que o jogo recebe no build — e as peças da tampinha tiradas do
//     jogo em catalogo_tampinhas.json): o preço de cada coisa é SEMPRE o daqui, nunca o que o aparelho manda;
//   · os períodos (dia e semana em UTC, a temporada), os destaques do dia e as ofertas da semana (iguais para todos);
//   · as recompensas das partidas e do treino (as mesmas do jogo: tools/v70/economia.js e o PREMIO do jogo) com tetos;
//   · as missões (diárias, semanais, da temporada e especiais dos eventos) e o que cada partida conta nelas;
//   · o Passe RACHA (níveis, XP, as duas trilhas);
//   · a liga da semana (a mesma conta do jogo, com os gols que o servidor contou);
//   · as denúncias (os motivos e a proteção contra repetida/abusiva), os anexos do correio e os eventos padrão.
// ============================================================================
import CAT from "./catalogo88.json" with { type: "json" };
import TAMPAS from "./catalogo_tampinhas.json" with { type: "json" };

// ---------------------------------------------------------------- tipos do catálogo
export type Raridade = "comum" | "raro" | "epico" | "lendario" | "exclusivo";
export type TipoItem = "bola" | "efeito" | "comemoracao" | "gol" | "banner" | "avatar" | "tampinha" | "caixa";
export type ItemCat = {
  id: string; tipo: TipoItem; nome: string; raridade: Raridade; moedas?: number; gemas?: number;
  gratis?: boolean; venda?: boolean; desc?: string; visual?: Record<string, unknown>;
  conteudo?: { tipo: "moedas" | "gemas"; qtd: number }[];
};
export type Peca = { k: string; tipo: string; id: string; nome: string; tipoNome: string; raridade: string; moedas: number; gemas: number; anim: boolean };
export type Pacote = { id: string; nome: string; raridade: Raridade; moedas: number; gemas: number; desc: string; itens: string[] };
export type Premio = { moedas?: number; gemas?: number; xp_passe?: number; item?: string };
export type Missao = { id: string; nome: string; tipo: TipoMissao; meta: number; premio: Premio };
export type TipoMissao = "partidas" | "vitorias" | "gols" | "assistencias" | "ranqueadas" | "amigo" | "treino_gols";
export type RecompensaPasse = { tipo: "moedas" | "gemas" | "item"; qtd?: number; codigo?: string };

export const CATALOGO = CAT as unknown as {
  versao: number;
  raridades: Record<Raridade, { nome: string; cor: string }>;
  categorias: { id: string; nome: string; tipo?: TipoItem }[];
  tiposEquipaveis: TipoItem[];
  padroes: Record<string, string>;
  itens: ItemCat[];
  pacotes: Pacote[];
  trocas: { id: string; gemas: number; moedas: number }[];
  ofertas: { porSemana: number; desconto: number };
  destaques: { porDia: number };
  temporada: {
    id: string; nome: string; inicio: string; fim: string; xpPorNivel: number; niveis: number; premiumGemas: number;
    xp: { partida: number; vitoria: number; golTreino: number };
    trilha: { n: number; g: RecompensaPasse; p: RecompensaPasse }[];
  };
  missoes: {
    diarias: { porDia: number; fixas: string[]; lista: Missao[] };
    semanais: { porSemana: number; fixas: string[]; lista: Missao[] };
    temporada: { lista: Missao[] };
  };
};
export const PECAS = (TAMPAS as unknown as { pecas: Peca[] }).pecas;

const ITENS = new Map(CATALOGO.itens.map((i) => [i.id, i]));
const PECAS_MAP = new Map(PECAS.map((p) => [p.k, p]));
const PACOTES = new Map(CATALOGO.pacotes.map((p) => [p.id, p]));

export const itemCat = (id: string): ItemCat | undefined => ITENS.get(id);
export const pacoteCat = (id: string): Pacote | undefined => PACOTES.get(id);
// as peças da tampinha no inventário da conta: "peca:b:dt" (o código do jogo é "b:dt")
export const codigoPeca = (k: string) => "peca:" + k;
export const pecaDoCodigo = (codigo: string): Peca | undefined => (codigo.startsWith("peca:") ? PECAS_MAP.get(codigo.slice(5)) : undefined);
export const ehPecaGratis = (p: Peca) => p.raridade === "gratis";

// o que existe para ter (item do catálogo novo ou peça da tampinha): o servidor só grava código que exista aqui
export function existeCodigo(codigo: string): boolean {
  return ITENS.has(codigo) || !!pecaDoCodigo(codigo);
}
export function nomeDoCodigo(codigo: string): string {
  const i = ITENS.get(codigo);
  if (i) return i.nome;
  const p = pecaDoCodigo(codigo);
  if (p) return p.tipoNome + " " + p.nome;
  const pc = PACOTES.get(codigo);
  return pc ? pc.nome : codigo;
}

// ---------------------------------------------------------------- períodos (UTC)
export const diaUtc = (d: Date = new Date()) => d.toISOString().slice(0, 10);
export function segundaUtc(d: Date = new Date()): string {                  // a segunda-feira da semana (UTC)
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7));
  return x.toISOString().slice(0, 10);
}
const DIA0 = Date.UTC(2024, 0, 1);                                            // 1º/1/2024 foi uma segunda-feira
export const numeroDoDia = (d: Date = new Date()) => Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - DIA0) / 864e5);
export const numeroDaSemana = (d: Date = new Date()) => Math.floor(numeroDoDia(d) / 7);
export const periodoDia = (d?: Date) => "D:" + diaUtc(d);
export const periodoSemana = (d?: Date) => "S:" + segundaUtc(d);
export const periodoTemporada = () => "T:" + CATALOGO.temporada.id;
export function temporadaAtiva(d: Date = new Date()): boolean {
  const t = d.getTime();
  return t >= Date.parse(CATALOGO.temporada.inicio) && t < Date.parse(CATALOGO.temporada.fim);
}
// sorteio que não muda: o mesmo número de dia/semana dá a mesma escolha (para todo mundo)
function hash01(a: number, b: number): number {
  let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function escolhe<T>(lista: T[], n: number, semente: number): T[] {
  const l = lista.map((x, i) => ({ x, k: hash01(semente, i + 1) }));
  l.sort((a, b) => a.k - b.k);
  return l.slice(0, Math.max(0, n)).map((q) => q.x);
}

// ---------------------------------------------------------------- a loja: o que está à venda e por quanto
export type Venda = { codigo: string; tipo: "item" | "peca" | "pacote"; nome: string; raridade: string; moedas: number; gemas: number; base: { moedas: number; gemas: number }; desconto: number; categoria: string };
const vendivel = (i: ItemCat) => !i.gratis && i.venda !== false && ((i.moedas || 0) > 0 || (i.gemas || 0) > 0);
const CAT_DO_TIPO: Record<string, string> = { bola: "bolas", efeito: "efeitos", comemoracao: "comemoracoes", gol: "gols", banner: "banners", avatar: "avatares" };
export function categoriaDoItem(i: ItemCat): string {
  return CAT_DO_TIPO[i.tipo] || "tampinhas";
}
// as ofertas da semana: itens do catálogo novo (não peças) com o desconto do catálogo
export function ofertasDaSemana(d: Date = new Date()): string[] {
  const candidatos = CATALOGO.itens.filter(vendivel).map((i) => i.id);
  return escolhe(candidatos, CATALOGO.ofertas.porSemana, 7000 + numeroDaSemana(d));
}
// os destaques do dia: um item de cada categoria (bola, efeito, comemoração, gol, banner, avatar) e peças da tampinha
export function destaquesDoDia(d: Date = new Date()): string[] {
  const n = numeroDoDia(d);
  const out: string[] = [];
  for (const tipo of ["bola", "efeito", "comemoracao", "gol", "banner", "avatar"]) {
    const l = CATALOGO.itens.filter((i) => i.tipo === tipo && vendivel(i)).map((i) => i.id);
    out.push(...escolhe(l, 1, 9100 + n * 13 + tipo.length));
  }
  const pecas = PECAS.filter((p) => !ehPecaGratis(p)).map((p) => codigoPeca(p.k));
  out.push(...escolhe(pecas, Math.max(0, CATALOGO.destaques.porDia - 4), 9900 + n));
  return out.slice(0, Math.max(CATALOGO.destaques.porDia, 6) + 2);
}
// o preço de verdade de um código à venda (ou null: não está à venda). extraOfertas: as do evento temporário (RACHA CONTROL)
export function precoDe(codigo: string, d: Date = new Date(), extraOfertas: Record<string, number> = {}): Venda | null {
  const ofertas = new Set(ofertasDaSemana(d));
  const desc = (c: string) => Math.max(0, Math.min(90, extraOfertas[c] ?? (ofertas.has(c) ? CATALOGO.ofertas.desconto : 0)));
  const aplica = (v: number, pct: number) => (v > 0 ? Math.max(1, Math.round((v * (100 - pct)) / 100)) : 0);
  const i = ITENS.get(codigo);
  if (i) {
    if (!vendivel(i)) return null;
    const pct = desc(codigo);
    return { codigo, tipo: "item", nome: i.nome, raridade: i.raridade, moedas: aplica(i.moedas || 0, pct), gemas: aplica(i.gemas || 0, pct), base: { moedas: i.moedas || 0, gemas: i.gemas || 0 }, desconto: pct, categoria: categoriaDoItem(i) };
  }
  const p = pecaDoCodigo(codigo);
  if (p) {
    if (ehPecaGratis(p)) return null;
    const pct = Math.max(0, Math.min(90, extraOfertas[codigo] ?? 0));
    return { codigo, tipo: "peca", nome: p.tipoNome + " " + p.nome, raridade: p.raridade, moedas: aplica(p.moedas, pct), gemas: aplica(p.gemas, pct), base: { moedas: p.moedas, gemas: p.gemas }, desconto: pct, categoria: "tampinhas" };
  }
  const pc = PACOTES.get(codigo);
  if (pc) return { codigo, tipo: "pacote", nome: pc.nome, raridade: pc.raridade, moedas: pc.moedas, gemas: pc.gemas, base: { moedas: pc.moedas, gemas: pc.gemas }, desconto: 0, categoria: "pacotes" };
  return null;
}
// equipar: o que dá para equipar em cada lugar (o tipo do item) e o que é de graça para todo mundo
export function podeEquipar(tipo: string, codigo: string, tem: (c: string) => boolean): boolean {
  if (!CATALOGO.tiposEquipaveis.includes(tipo as TipoItem)) return false;
  const i = ITENS.get(codigo);
  if (!i || i.tipo !== tipo) return false;
  return !!i.gratis || tem(codigo);
}

// ---------------------------------------------------------------- as recompensas das partidas e do treino (as do jogo)
export const PREMIO = {
  golPartida: 10, partida: 25, vitoria: 60,           // moedas (o PREMIO do jogo)
  golLivre: 4, golLivreDia: 15,                       // treino livre: 4 por gol, até 15 gols por dia (o ECO_CAP do jogo)
  treino: [10, 30, 60, 100], recorde: 20, tresGemas: 10, exercicioCheio: 3, exercicioResto: 0.3,   // fim de exercício
  nivelMoedas: 100, nivelGemas: 5, nivel5Gemas: 25,   // cada nível da conta (e mais a cada 5)
  moedasDiaPartidas: 4000,                            // teto do dia (anti-farm) do que vem de partidas
  moedasDiaTreino: 1500,                              // teto do dia do que vem do treino (gols e exercícios)
} as const;
export function moedasDaPartida(o: { resultado: "vitoria" | "derrota" | "empate"; gols: number }): number {
  return PREMIO.partida + (o.resultado === "vitoria" ? PREMIO.vitoria : 0) + Math.max(0, Math.min(10, o.gols | 0)) * PREMIO.golPartida;
}
export function premioNivel(n: number): { moedas: number; gemas: number } {
  return { moedas: PREMIO.nivelMoedas, gemas: PREMIO.nivelGemas + (n % 5 === 0 ? PREMIO.nivel5Gemas : 0) };
}
// o fim de um exercício do treino: cheio nas 3 primeiras do dia (em cada exercício), depois reduzido
export function premioExercicio(estrelas: number, vezHoje: number, recorde: boolean, primeiraTres: boolean) {
  const b = PREMIO.treino[Math.max(0, Math.min(3, estrelas | 0))];
  const cheio = vezHoje <= PREMIO.exercicioCheio;
  return { moedas: (cheio ? b : Math.round(b * PREMIO.exercicioResto)) + (recorde ? PREMIO.recorde : 0), gemas: estrelas >= 3 && primeiraTres ? PREMIO.tresGemas : 0, cheio };
}
// o melhor da partida contra os bots (o jogo manda quem marcou mais; o servidor só aceita se for possível)
export function mvpPlausivel(o: { mvp: boolean; gols: number; assistencias: number; resultado: string; placarNosso: number }): boolean {
  if (!o.mvp) return false;
  if (o.gols + o.assistencias < 1) return false;
  if (o.resultado === "derrota" && o.gols < 2) return false;
  return o.gols + o.assistencias >= Math.ceil(o.placarNosso / 2) || o.resultado === "derrota";
}

// ---------------------------------------------------------------- as missões
export type EventoPartida = { partida: number; vitoria: number; gols: number; assistencias: number; ranqueada: number; amigo: number; treino_gols: number };
export const EVENTO_VAZIO: EventoPartida = { partida: 0, vitoria: 0, gols: 0, assistencias: 0, ranqueada: 0, amigo: 0, treino_gols: 0 };
const CAMPO: Record<TipoMissao, keyof EventoPartida> = { partidas: "partida", vitorias: "vitoria", gols: "gols", assistencias: "assistencias", ranqueadas: "ranqueada", amigo: "amigo", treino_gols: "treino_gols" };
export const quantoConta = (m: { tipo: TipoMissao }, e: EventoPartida) => Math.max(0, e[CAMPO[m.tipo]] | 0);
const MISSOES = new Map<string, Missao>([...CATALOGO.missoes.diarias.lista, ...CATALOGO.missoes.semanais.lista, ...CATALOGO.missoes.temporada.lista].map((m) => [m.id, m]));
export const missaoCat = (id: string) => MISSOES.get(id);
function sorteiaMissoes(grupo: { fixas: string[]; lista: Missao[] }, n: number, semente: number): Missao[] {
  const fixas = grupo.fixas.map((id) => grupo.lista.find((m) => m.id === id)).filter(Boolean) as Missao[];
  const resto = grupo.lista.filter((m) => !grupo.fixas.includes(m.id));
  return [...fixas, ...escolhe(resto, Math.max(0, n - fixas.length), semente)];
}
export function missoesDoDia(d: Date = new Date()): Missao[] {
  return sorteiaMissoes(CATALOGO.missoes.diarias, CATALOGO.missoes.diarias.porDia, 3100 + numeroDoDia(d));
}
export function missoesDaSemana(d: Date = new Date()): Missao[] {
  return sorteiaMissoes(CATALOGO.missoes.semanais, CATALOGO.missoes.semanais.porSemana, 5300 + numeroDaSemana(d));
}
export function missoesDaTemporada(): Missao[] {
  return CATALOGO.missoes.temporada.lista.slice();
}
// as missões especiais dos eventos (config.missoes do evento): mesmas regras, ids prefixados pelo evento
export function missoesDoEvento(ev: { slug: string; config: Record<string, unknown> }): Missao[] {
  const l = Array.isArray(ev.config?.missoes) ? (ev.config.missoes as Partial<Missao>[]) : [];
  return l
    .filter((m) => m && typeof m.id === "string" && m.tipo && CAMPO[m.tipo as TipoMissao] && Number(m.meta) > 0)
    .slice(0, 8)
    .map((m) => ({ id: ("e_" + ev.slug + "_" + m.id).slice(0, 40), nome: String(m.nome || "Desafio").slice(0, 60), tipo: m.tipo as TipoMissao, meta: Math.min(10000, Math.floor(Number(m.meta))), premio: normalizaPremio(m.premio) }));
}
export function normalizaPremio(p: unknown): Premio {
  const o = (p && typeof p === "object" ? p : {}) as Record<string, unknown>;
  const n = (v: unknown, max: number) => Math.max(0, Math.min(max, Math.floor(Number(v) || 0)));
  const r: Premio = {};
  if (n(o.moedas, 100000)) r.moedas = n(o.moedas, 100000);
  if (n(o.gemas, 5000)) r.gemas = n(o.gemas, 5000);
  if (n(o.xp_passe, 20000)) r.xp_passe = n(o.xp_passe, 20000);
  if (typeof o.item === "string" && existeCodigo(o.item)) r.item = o.item;
  return r;
}

// ---------------------------------------------------------------- o Passe RACHA
export function nivelPasse(xp: number): { nivel: number; atual: number; prox: number; max: boolean } {
  const T = CATALOGO.temporada;
  const n = Math.min(T.niveis, Math.floor(Math.max(0, xp) / T.xpPorNivel));
  return { nivel: n, atual: n >= T.niveis ? T.xpPorNivel : Math.max(0, xp) - n * T.xpPorNivel, prox: T.xpPorNivel, max: n >= T.niveis };
}
export function recompensaPasse(n: number, trilha: "g" | "p"): RecompensaPasse | null {
  const l = CATALOGO.temporada.trilha.find((x) => x.n === n);
  return l ? l[trilha] : null;
}
export function xpPasseDaPartida(resultado: string): number {
  const x = CATALOGO.temporada.xp;
  return x.partida + (resultado === "vitoria" ? x.vitoria : 0);
}

// ---------------------------------------------------------------- os anexos do correio (o que o servidor aceita entregar)
export type Anexo = { tipo: "moedas" | "gemas" | "item" | "xp_passe"; qtd: number; codigo?: string };
export const ANEXO_MAX = { moedas: 1000000, gemas: 50000, xp_passe: 50000, itens: 10 } as const;
export function validaAnexos(lista: unknown): { ok: true; anexos: Anexo[] } | { ok: false; erro: string } {
  if (!Array.isArray(lista)) return { ok: false, erro: "Anexos inválidos." };
  if (lista.length > 12) return { ok: false, erro: "Anexos demais (até 12)." };
  const out: Anexo[] = [];
  let itens = 0;
  for (const a of lista) {
    const o = (a && typeof a === "object" ? a : {}) as Record<string, unknown>;
    const qtd = Math.floor(Number(o.qtd) || 0);
    if (o.tipo === "moedas" || o.tipo === "gemas" || o.tipo === "xp_passe") {
      const max = ANEXO_MAX[o.tipo];
      if (qtd < 1 || qtd > max) return { ok: false, erro: `Quantidade de ${o.tipo} fora do limite (1 a ${max}).` };
      out.push({ tipo: o.tipo, qtd });
    } else if (o.tipo === "item") {
      if (typeof o.codigo !== "string" || !existeCodigo(o.codigo)) return { ok: false, erro: "Item que não existe no catálogo: " + String(o.codigo) };
      if (++itens > ANEXO_MAX.itens) return { ok: false, erro: "Itens demais numa carta." };
      out.push({ tipo: "item", qtd: 1, codigo: o.codigo });
    } else return { ok: false, erro: "Tipo de anexo desconhecido." };
  }
  return { ok: true, anexos: out };
}
export function anexosDoPremio(p: Premio): Anexo[] {
  const l: Anexo[] = [];
  if (p.moedas) l.push({ tipo: "moedas", qtd: p.moedas });
  if (p.gemas) l.push({ tipo: "gemas", qtd: p.gemas });
  if (p.xp_passe) l.push({ tipo: "xp_passe", qtd: p.xp_passe });
  if (p.item) l.push({ tipo: "item", qtd: 1, codigo: p.item });
  return l;
}

// ---------------------------------------------------------------- denúncias
export const MOTIVOS_DENUNCIA = ["trapaca", "toxico", "ofensa", "spam", "nome", "bug", "outro"] as const;
export type MotivoDenuncia = (typeof MOTIVOS_DENUNCIA)[number];
export const MOTIVO_TEXTO: Record<MotivoDenuncia, string> = {
  trapaca: "Uso de trapaças", toxico: "Comportamento tóxico", ofensa: "Ofensas", spam: "Spam",
  nome: "Nome inadequado", bug: "Abuso de bugs", outro: "Outros",
};
// os motivos antigos (o site e o amigos.denunciar de antes) continuam valendo
export const MOTIVO_ANTIGO: Record<string, MotivoDenuncia> = { nome_ofensivo: "nome", "trapaça": "trapaca", assedio: "toxico", conteudo_improprio: "ofensa", outro: "outro" };
export const DENUNCIA = {
  porHora: 10,            // denúncias por hora de cada conta
  porDia: 30,             // e por dia
  mesmoAlvoDia: 1,        // a mesma conta, pelo mesmo motivo, uma vez por dia (a repetida não entra)
  minutosContaNova: 10,   // conta criada há menos que isso não denuncia (conta feita só para denunciar)
  arquivadasParaAbuso: 5, // quem teve 5 denúncias arquivadas (sem fundamento) nos últimos 30 dias fica sem poder denunciar por 7 dias
} as const;
export const chaveDenuncia = (autorId: number, alvoId: number, motivo: string, d: Date = new Date()) => `${autorId}:${alvoId}:${motivo}:${diaUtc(d)}`;

// ---------------------------------------------------------------- texto que vai para os outros (bio, mensagens do sistema)
const FEIO = [/\bp[o0]rr?a\b/i, /\bc[a@]r[a@]lh[o0]\b/i, /\bm[e3]rd[a@]\b/i, /\bf[o0]d[a@]-?s[e3]\b/i, /\bput[a@]\b/i, /\bv[i1]ad[o0]\b/i, /\bc[uú]\b/i, /\bbuceta\b/i, /\bpau no\b/i, /\bfdp\b/i, /\bvsf\b/i, /\bkrl\b/i];
const PRIVADO = [/https?:/i, /www\./i, /\.(com|net|gg|br|io|app|xyz|link|org)\b/i, /discord\./i, /t\.me\//i, /wa\.me/i, /@\w{3,}/, /\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4}/, /\d{3}\.?\d{3}\.?\d{3}-?\d{2}/, /[\w.+-]+@[\w-]+\.[\w.]+/];
export function textoLimpo(s: string): { ok: boolean; motivo?: string } {
  if (FEIO.some((r) => r.test(s))) return { ok: false, motivo: "linguagem ofensiva" };
  if (PRIVADO.some((r) => r.test(s))) return { ok: false, motivo: "link ou dado pessoal" };
  return { ok: true };
}

// ---------------------------------------------------------------- a liga da semana (a mesma do jogo, contada no servidor)
export const RIVAIS_LIGA: [string, number][] = [["Duda", 1], ["Biel", 0.9], ["Kaká", 0.86], ["Lipe", 0.8], ["Tico", 0.76], ["Nina", 0.72], ["Rafa", 0.68], ["Gui", 0.64],
  ["Malu", 0.61], ["Léo", 0.58], ["Bia", 0.55], ["Caio", 0.52], ["Juninho", 0.49], ["Vitinho", 0.46], ["Mel", 0.43], ["Davi", 0.41], ["Teteu", 0.39], ["Lari", 0.36],
  ["Nando", 0.34], ["Cadu", 0.32], ["Fefê", 0.3], ["Binho", 0.28], ["Jajá", 0.26], ["Zeca", 0.24], ["Dani", 0.22], ["Pedrinho", 0.2], ["Lelê", 0.18], ["Thiaguinho", 0.16], ["Neném", 0.14]];
export function golsRivalFimDaSemana(i: number, semana: number): number {
  return Math.round(RIVAIS_LIGA[i][1] * (78 + 26 * hash01(semana, i)));
}
export const PREMIOS_LIGA = [{ ate: 1, gemas: 200, moedas: 1000 }, { ate: 3, gemas: 50, moedas: 500 }, { ate: 10, gemas: 0, moedas: 500 }, { ate: 99, gemas: 0, moedas: 150 }];
export function posicaoNaLiga(gols: number, semana: number): number {
  let pos = 1;
  RIVAIS_LIGA.forEach((_, i) => { if (golsRivalFimDaSemana(i, semana) > gols) pos++; });
  return pos;
}

// ---------------------------------------------------------------- os eventos padrão (o servidor cria se não houver nenhum)
export type EventoPadrao = { slug: string; tipo: "ativo" | "login" | "desafio" | "torneio" | "temporada" | "temporario"; nome: string; descricao: string; regras: string; imagem: string; inicio: Date; fim: Date; config: Record<string, unknown>; ordem: number };
export function eventosPadrao(agora: Date = new Date()): EventoPadrao[] {
  const T = CATALOGO.temporada;
  const ini = new Date(Date.parse(T.inicio)), fim = new Date(Date.parse(T.fim));
  return [
    { slug: "login-da-rua", tipo: "login", nome: "LOGIN DIÁRIO DA RUA", imagem: "favela", ordem: 1, inicio: ini, fim,
      descricao: "Entre no jogo todo dia e pegue o prêmio do dia (7 dias seguidos ou não).",
      regras: "Um prêmio por dia (o dia vira à meia-noite UTC — 21h no horário de Brasília). Os dias não precisam ser seguidos: o próximo prêmio da lista espera você voltar. Depois do 7º, a lista recomeça.",
      config: { dias: [{ moedas: 200 }, { moedas: 300 }, { gemas: 5 }, { moedas: 500 }, { item: "av_bola" }, { moedas: 800 }, { gemas: 30, item: "efeito_poeira" }] } },
    { slug: "desafio-da-favela", tipo: "desafio", nome: "DESAFIO DA FAVELA", imagem: "quadra", ordem: 2, inicio: ini, fim,
      descricao: "Complete os desafios da quebrada e ganhe recompensas.",
      regras: "Vale partida válida contada pelo servidor (contra os bots ou online). Cada desafio paga uma vez durante o evento.",
      config: { missoes: [
        { id: "gols10", nome: "Marque 10 gols", tipo: "gols", meta: 10, premio: { moedas: 600, xp_passe: 200 } },
        { id: "vit3", nome: "Vença 3 partidas", tipo: "vitorias", meta: 3, premio: { moedas: 500, xp_passe: 200 } },
        { id: "amigo2", nome: "Jogue 2 partidas com amigos", tipo: "amigo", meta: 2, premio: { gemas: 20, xp_passe: 300 } },
      ] } },
    { slug: "copa-dos-amigos", tipo: "torneio", nome: "COPA DOS AMIGOS", imagem: "copa", ordem: 3, inicio: ini, fim,
      descricao: "Monte uma sala com 4 ou 8 amigos e dispute o mata-mata 1v1.",
      regras: "Crie uma sala personalizada, chame a galera (4 ou 8 pessoas) e o admin sorteia a chave. O campeão entra na galeria de campeões do servidor.",
      config: { acao: "copa" } },
    { slug: "temporada-1", tipo: "temporada", nome: T.nome, imagem: "passe", ordem: 4, inicio: ini, fim,
      descricao: "A primeira temporada do Passe RACHA: 30 níveis, trilha grátis e premium.",
      regras: "Ganhe XP do passe jogando partidas válidas e completando missões. A trilha premium é desbloqueada com gemas. O progresso fica na sua conta até o fim da temporada.",
      config: { acao: "passe" } },
    { slug: "bem-vindo-v88", tipo: "temporario", nome: "BOAS-VINDAS À NOVA LOJA", imagem: "loja", ordem: 5, inicio: agora, fim: new Date(agora.getTime() + 14 * 864e5),
      descricao: "Um presente para estrear a loja nova e o correio.",
      regras: "Pegue uma vez durante o evento: o presente chega no seu correio.",
      config: { presente: [{ tipo: "moedas", qtd: 1000 }, { tipo: "item", codigo: "av_10", qtd: 1 }] } },
  ];
}
