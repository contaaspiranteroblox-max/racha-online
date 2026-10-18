// RACHA · v88.1 — o "@/providers/trpc" dos testes de navegador do SITE (tests/ui_site): o mesmo jeito de chamar
// (trpc.x.y.useQuery / useMutation / useUtils) em cima do fetch, sem o @trpc/react-query e o @tanstack/react-query (o npm não
// instala nada nesta máquina). Fala com as rotas de verdade da plataforma de teste, com os cookies (credentials: include),
// no mesmo formato do httpBatchLink (?batch=1, {"0":{"json":…}}). Só para os testes: nada daqui vai para o site.
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

type Ouvinte = () => unknown;
const ativos = new Set<Ouvinte>();
const w = window as unknown as { __trpc?: { chamadas: string[]; erros: string[] } };
w.__trpc = { chamadas: [], erros: [] };

async function chama(proc: string, input: unknown, query: boolean) {
  const corpo = JSON.stringify({ 0: { json: input === undefined ? null : input } });
  const url = "/api/trpc/" + proc + "?batch=1" + (query ? "&input=" + encodeURIComponent(corpo) : "");
  w.__trpc!.chamadas.push(proc);
  const r = await fetch(url, { method: query ? "GET" : "POST", headers: { "content-type": "application/json" }, credentials: "include", body: query ? undefined : corpo });
  const l = JSON.parse(await r.text());
  const um = Array.isArray(l) ? l[0] : l;
  if (um && um.error) {
    const e = new Error((um.error.json && um.error.json.message) || "erro") as Error & { data?: unknown };
    e.data = um.error.json && um.error.json.data;
    w.__trpc!.erros.push(proc + ": " + e.message);
    throw e;
  }
  return um && um.result && um.result.data ? um.result.data.json : undefined;
}

type Estado = { data: unknown; error: Error | null; isLoading: boolean; isSuccess: boolean };
function useQueryDe(proc: string, input: unknown, opts?: { enabled?: boolean }) {
  const enabled = !opts || opts.enabled !== false;
  const [st, setSt] = useState<Estado>({ data: undefined, error: null, isLoading: enabled, isSuccess: false });
  const chave = JSON.stringify(input === undefined ? null : input);
  const vivo = useRef(true);
  const busca = useCallback(async () => {
    if (!enabled) return { data: undefined };
    try {
      const d = await chama(proc, input, true);
      if (vivo.current) setSt({ data: d, error: null, isLoading: false, isSuccess: true });
      return { data: d };
    } catch (e) {
      if (vivo.current) setSt((s) => ({ ...s, error: e as Error, isLoading: false, isSuccess: false }));
      return { error: e };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proc, chave, enabled]);
  useEffect(() => {
    vivo.current = true;
    busca();
    ativos.add(busca);
    return () => { vivo.current = false; ativos.delete(busca); };
  }, [busca]);
  return { ...st, refetch: busca, isFetching: false };
}

type OpcMut = { onSuccess?: (d: any, v: any) => unknown; onError?: (e: any, v: any) => unknown; onSettled?: () => unknown };
function useMutationDe(proc: string, opts?: OpcMut) {
  const [isPending, setP] = useState(false);
  const ref = useRef(opts);
  ref.current = opts;
  const mutateAsync = useCallback(async (input?: unknown) => {
    setP(true);
    try {
      const d = await chama(proc, input, false);
      await ref.current?.onSuccess?.(d, input);
      return d;
    } catch (e) {
      ref.current?.onError?.(e, input);
      throw e;
    } finally {
      setP(false);
      ref.current?.onSettled?.();
    }
  }, [proc]);
  const mutate = useCallback((input?: unknown) => { mutateAsync(input).catch(() => {}); }, [mutateAsync]);
  return { mutate, mutateAsync, isPending, isLoading: isPending };
}

const invalidaTudo = () => Promise.all([...ativos].map((f) => f()));
const utils: any = new Proxy(function () {}, { get: (_t, k) => (k === "invalidate" || k === "refetch" ? invalidaTudo : utils) });
function no(caminho: string[]): any {
  return new Proxy(function () {}, {
    get(_t, k: string) {
      if (k === "useQuery") return (input: unknown, opts: { enabled?: boolean }) => useQueryDe(caminho.join("."), input, opts);
      if (k === "useMutation") return (opts: OpcMut) => useMutationDe(caminho.join("."), opts);
      if (k === "useUtils" || k === "useContext") return () => utils;
      return no([...caminho, k]);
    },
  });
}
export const trpc: any = no([]);
export function TRPCProvider({ children }: { children: ReactNode }) { return <>{children}</>; }
