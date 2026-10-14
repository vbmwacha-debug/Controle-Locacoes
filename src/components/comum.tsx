import { useEffect, useRef, useState, type ReactNode } from "react";
import { STATUS, type StatusKey } from "../lib/calc";
import { ACOES } from "../lib/tipos";

export function Chip({ st, children }: { st: StatusKey | string; children?: ReactNode }) {
  return <span className={`chip st-${st}`}>{children ?? STATUS[st as StatusKey]?.l ?? st}</span>;
}

export function ChipAcao({ acao }: { acao: string }) {
  const a = ACOES[acao] ?? { l: acao, c: "editou" };
  return <span className={`chip act-${a.c}`}>{a.l}</span>;
}

export function Kpi({ l, v, sub, tipo }: { l: string; v: ReactNode; sub?: ReactNode; tipo?: "crit" | "serious" }) {
  return (
    <div className={`kpi ${tipo ?? ""}`}>
      <span className="l">{l}</span>
      <span className="v">{v}</span>
      {sub != null && <span className="sub">{sub}</span>}
    </div>
  );
}

/** Tooltip global: qualquer elemento com data-tip mostra o texto ao passar o mouse (ou tocar). */
export function Tooltip() {
  const [t, setT] = useState<{ x: number; y: number; s: string } | null>(null);
  useEffect(() => {
    const mover = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest?.("[data-tip]") as HTMLElement | null;
      if (!el) return setT(null);
      setT({ x: Math.min(e.clientX + 12, window.innerWidth - 250), y: e.clientY + 14, s: el.dataset.tip || "" });
    };
    document.addEventListener("mousemove", mover);
    document.addEventListener("click", mover);
    return () => {
      document.removeEventListener("mousemove", mover);
      document.removeEventListener("click", mover);
    };
  }, []);
  if (!t) return null;
  return (
    <div id="tip" style={{ left: t.x, top: t.y }}>
      {t.s}
    </div>
  );
}

/** Painel lateral (ficha do imóvel, importação). */
export function Drawer({ aberto, largo, onFechar, rotulo, children }: {
  aberto: boolean; largo?: boolean; onFechar: () => void; rotulo: string; children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const fechar = useRef(onFechar);
  fechar.current = onFechar;
  useEffect(() => {
    if (!aberto) return;
    const anterior = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    ref.current?.scrollTo({ top: 0 });
    const esc = (e: KeyboardEvent) => e.key === "Escape" && fechar.current();
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("keydown", esc);
      anterior?.focus?.();
    };
  }, [aberto]);
  if (!aberto) return null;
  return (
    <>
      <div className="scrim" onClick={onFechar} />
      <aside ref={ref} className={`drawer ${largo ? "wide" : ""}`} aria-label={rotulo} tabIndex={-1}>
        {children}
      </aside>
    </>
  );
}

export function Campo({ id, label, obrig, children, className, invalido }: {
  id?: string; label: ReactNode; obrig?: boolean; children: ReactNode; className?: string; invalido?: boolean;
}) {
  return (
    <div className={`field ${className ?? ""} ${invalido ? "invalid" : ""}`}>
      <label htmlFor={id}>
        {label}
        {obrig && <span className="req"> *</span>}
      </label>
      {children}
    </div>
  );
}

export const opcoes = (lista: (string | [string | number, string])[]) =>
  lista.map((o) =>
    Array.isArray(o) ? (
      <option key={String(o[0])} value={o[0]}>
        {o[1]}
      </option>
    ) : (
      <option key={o} value={o}>
        {o}
      </option>
    ),
  );
