// ============================================================================
// RACHA v109 — RACHA CONTROL › O PAINEL DA STAFF (Administrador, Moderador e Ajudante): cuidar do jogo. Achar o jogador e
// moderar (silenciar o chat, banir, advertir, tirar da sala, trocar o nome, as notas), as denúncias, os punidos e o que eu
// fiz. Não tem selo, presente, item, moeda nem gema: isso é do painel do Dono. Tudo fica registrado para o Dono.
// ============================================================================
import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Abas, AbaDenuncias, AbaMeusRegistros, AbaPunidos, BuscaJogador, COR_PAINEL, MiniStat, NOME_CARGO, type Opcoes } from "./PainelComum";

type Usuario = { nome: string; username: string; avatarEmoji: string; idPublico?: string };

// o que cada cargo faz (o resumo que aparece em cima do painel)
const PODE: Record<string, string> = {
  administrador: "silenciar o chat até 30 dias, banir até 90 dias ou para sempre, advertir, tirar da sala, trocar nomes, tirar punições e zerar a patente de quem trapaceou",
  moderador: "silenciar o chat até 10 dias, banir até 7 dias, advertir, tirar da sala e trocar nomes",
  ajudante: "silenciar o chat até 1 hora, advertir, tirar da sala e cuidar das denúncias",
};

export default function PainelStaff({ cargo, permissoes, usuario, sair }: { cargo: string; permissoes: string[]; usuario: Usuario; sair: React.ReactNode }) {
  const tem = (p: string) => permissoes.includes(p);
  const opcoes = trpc.staff109.opcoes.useQuery();
  const dash = trpc.admin.dashboard.useQuery(undefined, { enabled: tem("consultar_jogadores") });
  const abas = [
    tem("consultar_jogadores") && { id: "jogadores", rotulo: "👥 Jogadores" },
    (tem("analisar_denuncias") || tem("ver_denuncias_atribuidas")) && { id: "denuncias", rotulo: "🚩 Denúncias" },
    tem("consultar_jogadores") && { id: "punidos", rotulo: "⛔ Punidos" },
    { id: "registros", rotulo: "📜 Meus registros" },
  ].filter(Boolean) as { id: string; rotulo: string }[];
  const [aba, setAba] = useState(abas[0]?.id ?? "registros");
  const [ficha, setFicha] = useState<string | undefined>(undefined);
  const cor = COR_PAINEL.staff;
  const op = opcoes.data as Opcoes | undefined;

  return (
    <div className="mx-auto max-w-4xl space-y-4" data-testid="painel-staff">
      <div className="cartao-rua flex flex-wrap items-center gap-3 p-4" style={{ borderColor: cor }}>
        <span className="text-3xl">{usuario.avatarEmoji}</span>
        <div className="min-w-0 flex-1">
          <div className="texto-pixo text-xl leading-none" style={{ color: cor }}>PAINEL DA STAFF</div>
          <div className="mt-1 text-xs text-[#b0a6e8]">
            {usuario.nome} · <span style={{ color: cor }}>{NOME_CARGO[cargo] ?? cargo}</span>
          </div>
        </div>
        {dash.data && (
          <div className="flex gap-3 text-center text-xs">
            <MiniStat n={dash.data.jogadores} r="JOGADORES" />
            <MiniStat n={dash.data.denunciasAbertas} r="DENÚNCIAS" />
          </div>
        )}
        {sair}
      </div>
      <div className="rounded-xl border-2 px-4 py-2 text-xs text-[#d8d2f5]" style={{ borderColor: cor + "66", background: cor + "14" }}>
        Você pode {PODE[cargo] ?? "moderar"}. Selo, presente, item, moeda e gema são só do Dono. Tudo o que você faz aqui fica registrado para o Dono.
      </div>
      <Abas abas={abas} aba={aba} setAba={setAba} cor={cor} />
      {!op && <div className="cartao-rua p-5 text-sm text-[#b0a6e8]">Abrindo...</div>}
      {op && aba === "jogadores" && <BuscaJogador key={ficha ?? "busca"} modo="staff" tem={tem} opcoes={op} inicial={ficha} />}
      {op && aba === "denuncias" && <AbaDenuncias tem={tem} opcoes={op} abreFicha={(id) => { setFicha(id); setAba("jogadores"); }} />}
      {op && aba === "punidos" && <AbaPunidos tem={tem} />}
      {op && aba === "registros" && <AbaMeusRegistros />}
    </div>
  );
}
