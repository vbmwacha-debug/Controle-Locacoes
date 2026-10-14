// Datas tratadas como texto ISO "aaaa-mm-dd" (sem hora) para não sofrer com fuso.

export type ISO = string;

const pad = (n: number) => String(n).padStart(2, "0");

export function toISO(y: number, m: number, d: number): ISO {
  return `${y}-${pad(m)}-${pad(d)}`;
}

export function parts(iso: ISO): [number, number, number] {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return [y, m, d];
}

function utc(iso: ISO): number {
  const [y, m, d] = parts(iso);
  return Date.UTC(y, m - 1, d);
}

function fromUtc(ms: number): ISO {
  const dt = new Date(ms);
  return toISO(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

/** Hoje no fuso America/Sao_Paulo. */
export function hojeSP(agora: Date = new Date()): ISO {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return f.format(agora);
}

/** Dias de a até b (b − a). */
export function diasEntre(a: ISO, b: ISO): number {
  return Math.round((utc(b) - utc(a)) / 864e5);
}

export function addDias(iso: ISO, n: number): ISO {
  return fromUtc(utc(iso) + n * 864e5);
}

const ultimoDia = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** Soma meses no calendário; dia 31 + 1 mês vira o último dia do mês (igual ao Postgres). */
export function addMeses(iso: ISO, n: number): ISO {
  const [y, m, d] = parts(iso);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return toISO(ny, nm, Math.min(d, ultimoDia(ny, nm)));
}

/** Diferença em meses com 1 casa decimal (usada para o prazo dos imóveis). */
export function mesesEntre(a: ISO, b: ISO): number {
  const [y1, m1, d1] = parts(a);
  const [y2, m2, d2] = parts(b);
  const v = (y2 - y1) * 12 + (m2 - m1) + (d2 - d1) / 30.4375;
  return Math.round(v * 10) / 10;
}

/** dd/mm/aaaa */
export function fmtData(iso: ISO | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = parts(iso);
  return `${pad(d)}/${pad(m)}/${y}`;
}

export function fmtDataHora(ts: string | Date): string {
  const d = typeof ts === "string" ? new Date(ts) : ts;
  return d.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
