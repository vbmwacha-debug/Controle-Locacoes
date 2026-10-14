export const brl = (v: number | null | undefined) =>
  (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const brl0 = (v: number | null | undefined) =>
  (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export const n2 = (v: number | null | undefined) =>
  (Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Compara textos sem diferenciar maiúsculas, acentos, asterisco e espaços extras. */
export const normalizar = (v: unknown) =>
  String(v ?? "")
    .replace(/\*/g, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

export const UNIDADE_LABEL: Record<string, string> = { mes: "mês", semana: "semana", dia: "dia" };

export const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** Ordena textos em português. */
export const ordemPt = (a: string, b: string) => a.localeCompare(b, "pt-BR");
