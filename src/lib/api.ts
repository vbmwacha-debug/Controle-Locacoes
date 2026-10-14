import { supabase } from "./supabase";
import type { Categoria, Diretoria, HistoricoLinha, ImovelDetalhes, LocStatus, Obra, Usuario } from "./tipos";

export interface Dados {
  diretorias: Diretoria[];
  obras: Obra[];
  categorias: Categoria[];
  usuarios: Usuario[];
  locacoes: LocStatus[];
  imoveis: Map<number, ImovelDetalhes>;
}

/** Lê todas as linhas de uma tabela/view (paginando de 1000 em 1000). */
async function tudo<T>(tabela: string, ordem = "id"): Promise<T[]> {
  const out: T[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await supabase.from(tabela).select("*").order(ordem).range(de, de + 999);
    if (error) throw new Error(error.message);
    out.push(...((data as T[]) || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

const NUM_LOC: (keyof LocStatus)[] = [
  "quantidade", "valor_unitario", "prazo", "encargos_ultra", "prazo_calculado", "periodos_usados",
  "valor_total_foc", "saldo", "mensal_base", "custo_mensal",
];

export async function carregarDados(): Promise<Dados> {
  const [diretorias, obras, categorias, usuarios, locacoes, imoveis] = await Promise.all([
    tudo<Diretoria>("loc_diretorias"),
    tudo<Obra>("loc_obras"),
    tudo<Categoria>("loc_categorias"),
    tudo<Usuario>("loc_usuarios"),
    tudo<LocStatus>("loc_locacoes_status"),
    tudo<ImovelDetalhes>("loc_imovel_detalhes", "locacao_id"),
  ]);
  for (const l of locacoes) for (const k of NUM_LOC) (l as unknown as Record<string, number>)[k] = Number(l[k]) || 0;
  return { diretorias, obras, categorias, usuarios, locacoes, imoveis: new Map(imoveis.map((i) => [i.locacao_id, i])) };
}

/** Chama uma função RPC e devolve a mensagem do banco em português se der erro. */
export async function rpc<T = unknown>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message || "Não foi possível salvar. Tente de novo.");
  return data as T;
}

export interface FiltroHistorico {
  usuario?: string;
  acao?: string;
  obraId?: number | null;
  locacaoId?: number | null;
  busca?: string;
  de?: string;
  ate?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function aplicarFiltro<Q extends any>(q: Q, f: FiltroHistorico): Q {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return filtrar(q as any, f) as Q;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function filtrar(q: any, f: FiltroHistorico): any {
  if (f.usuario) q = q.eq("usuario", f.usuario);
  if (f.acao) q = q.eq("acao", f.acao);
  if (f.obraId) q = q.eq("obra_id", f.obraId);
  if (f.locacaoId) q = q.eq("locacao_id", f.locacaoId);
  if (f.de) q = q.gte("em", f.de + "T00:00:00-03:00");
  if (f.ate) q = q.lt("em", proximoDia(f.ate) + "T00:00:00-03:00");
  const b = f.busca?.trim().replace(/[,()*%]/g, " ");
  if (b) {
    const p = `*${b}*`;
    q = q.or(`item_descricao.ilike.${p},item_fornecedor.ilike.${p},resumo.ilike.${p},referencia.ilike.${p},obra_nome.ilike.${p}`);
  }
  return q;
}

function proximoDia(iso: string) {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export async function buscarHistorico(f: FiltroHistorico, pagina: number, porPagina = 100) {
  const q = aplicarFiltro(
    supabase.from("loc_historico_view").select("*", { count: "exact" }).order("em", { ascending: false }).order("id", { ascending: false }),
    f,
  ).range(pagina * porPagina, pagina * porPagina + porPagina - 1);
  const { data, error, count } = await q;
  if (error) throw new Error(error.message);
  return { linhas: (data as HistoricoLinha[]) || [], total: count ?? 0 };
}

export async function buscarHistoricoTodo(f: FiltroHistorico) {
  const out: HistoricoLinha[] = [];
  for (let p = 0; ; p++) {
    const { linhas } = await buscarHistorico(f, p, 1000);
    out.push(...linhas);
    if (linhas.length < 1000) break;
  }
  return out;
}

export async function contarHistorico(f: FiltroHistorico & { semEntradas?: boolean }) {
  let q = aplicarFiltro(supabase.from("loc_historico_view").select("id", { count: "exact", head: true }), f);
  if (f.semEntradas) q = q.neq("acao", "entrou");
  const { count, error } = await q;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function usuariosAtivosDesde(deIso: string) {
  const { data, error } = await supabase.from("loc_historico_view").select("usuario").gte("em", deIso + "T00:00:00-03:00").limit(5000);
  if (error) throw new Error(error.message);
  return new Set((data || []).map((r: { usuario: string }) => r.usuario)).size;
}
