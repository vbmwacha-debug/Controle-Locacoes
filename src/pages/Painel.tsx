import { useMemo, useState } from "react";
import { Chip, Kpi, opcoes } from "../components/comum";
import { useApp } from "../estado";
import { ANTECEDENCIA, ORDEM_STATUS, STATUS } from "../lib/calc";
import { exportarGeral } from "../lib/excel";
import { brl, brl0, ordemPt, plural } from "../lib/format";
import type { LocStatus } from "../lib/tipos";

export const ativo = (r: LocStatus) => r.status !== "encerrado";

export function NomeItem({ r }: { r: LocStatus }) {
  const { abrirFicha } = useApp();
  return r.e_imovel ? (
    <>
      <button className="linkbtn" onClick={() => abrirFicha(r.id)}>
        {r.descricao}
      </button>{" "}
      <span className="tag">Imóvel</span>
    </>
  ) : (
    <>{r.descricao}</>
  );
}

export default function Painel() {
  const { dados, setObraSel, irPara, aviso } = useApp();
  const [fDir, setFDir] = useState("");
  const [fCat, setFCat] = useState("");
  const [fObra, setFObra] = useState("");
  const d = dados!;

  const categoriasUsadas = useMemo(() => {
    const m = new Map<number, string>();
    d.locacoes.forEach((l) => l.categoria_id && m.set(l.categoria_id, l.categoria_nome || ""));
    return [...m.entries()].sort((a, b) => ordemPt(a[1], b[1]));
  }, [d.locacoes]);

  const obrasFiltro = d.obras
    .filter((o) => !fDir || o.diretoria_id === +fDir)
    .filter((o) => d.locacoes.some((l) => l.obra_id === o.id))
    .sort((a, b) => ordemPt(a.nome, b.nome));

  const rows = d.locacoes.filter(
    (r) =>
      (!fDir || r.diretoria_id === +fDir) &&
      (!fCat || r.categoria_id === +fCat) &&
      (!fObra || r.obra_id === +fObra),
  );
  const ativos = rows.filter(ativo);
  const venc = ativos.filter((r) => r.status === "vencido");
  const ad = ativos.filter((r) => r.status === "aditar" || r.status === "atrasada");
  const mensal = ativos.reduce((s, r) => s + r.custo_mensal, 0);
  const mensalVenc = venc.reduce((s, r) => s + r.custo_mensal, 0);

  const acts = ativos
    .filter((r) => r.status_ordem <= 4)
    .sort((a, b) => a.status_ordem - b.status_ordem || (a.dias_fim ?? 0) - (b.dias_fim ?? 0));

  // barras empilhadas por diretoria
  const dirs = d.diretorias.filter((x) => (fDir ? x.id === +fDir : x.ativo || ativos.some((r) => r.diretoria_id === x.id)));
  const max = Math.max(1, ...dirs.map((x) => ativos.filter((r) => r.diretoria_id === x.id).length));
  const usados = ORDEM_STATUS.filter((s) => ativos.some((r) => r.status === s));

  // resumo por obra
  const porObra = [...new Set(rows.map((r) => r.obra_id))]
    .map((id) => {
      const rs = rows.filter((r) => r.obra_id === id);
      const at = rs.filter(ativo);
      return {
        id,
        nome: rs[0].obra_nome,
        dir: rs[0].diretoria_nome,
        gestor: rs[0].gestor_nome,
        n: at.length,
        v: at.filter((r) => r.status === "vencido").length,
        a: at.filter((r) => r.status === "aditar" || r.status === "atrasada").length,
        m: at.reduce((s, r) => s + r.custo_mensal, 0),
        sal: at.reduce((s, r) => s + r.saldo, 0),
      };
    })
    .sort((a, b) => b.v - a.v || b.a - a.a || ordemPt(a.nome, b.nome));

  async function exportar() {
    try {
      await exportarGeral(rows, "Painel");
    } catch (e) {
      aviso("Não foi possível gerar o Excel: " + (e as Error).message);
    }
  }

  return (
    <section className="view">
      <div className="bar">
        <h2>Visão de todas as obras</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
          <div className="field" style={{ width: 180 }}>
            <label htmlFor="fDir">Diretoria</label>
            <select id="fDir" value={fDir} onChange={(e) => { setFDir(e.target.value); setFObra(""); }}>
              <option value="">Todas as diretorias</option>
              {opcoes(d.diretorias.map((x) => [x.id, x.nome]))}
            </select>
          </div>
          <div className="field" style={{ width: 240 }}>
            <label htmlFor="fCat">Categoria</label>
            <select id="fCat" value={fCat} onChange={(e) => setFCat(e.target.value)}>
              <option value="">Todas as categorias</option>
              {opcoes(categoriasUsadas)}
            </select>
          </div>
          <div className="field" style={{ width: 220 }}>
            <label htmlFor="fObraP">Obra</label>
            <select id="fObraP" value={fObra} onChange={(e) => setFObra(e.target.value)}>
              <option value="">Todas as obras</option>
              {opcoes(obrasFiltro.map((o) => [o.id, o.nome]))}
            </select>
          </div>
          <button className="btn" onClick={exportar}>
            Exportar Excel
          </button>
        </div>
      </div>

      <div className="kpis">
        <Kpi l="Itens locados em campo" v={ativos.length} sub={plural(new Set(ativos.map((r) => r.obra_id)).size, "obra", "obras")} />
        <Kpi tipo="crit" l="Vencidos sem cobertura" v={venc.length} sub={`${brl0(mensalVenc)}/mês sem FOC válida`} />
        <Kpi tipo="serious" l="Aditar ou devolver agora" v={ad.length} sub={`aditivo em ≤ ${ANTECEDENCIA} dias ou saída atrasada`} />
        <Kpi l="Custo mensal em locação" v={brl0(mensal)} sub="itens em campo, com encargos dos imóveis" />
      </div>

      <div className="grid2">
        <div className="panel">
          <div className="bar">
            <h3>Ação imediata</h3>
            <span className="muted">{plural(acts.length, "item", "itens")}</span>
          </div>
          <ul className="alist">
            {acts.length ? (
              acts.map((r) => (
                <li key={r.id}>
                  <Chip st={r.status} />
                  <div style={{ minWidth: 0 }}>
                    <div className="what">
                      <NomeItem r={r} />
                    </div>
                    <div className="where">
                      {r.obra_nome} · {r.gestor_nome || "sem gestor"}
                      {r.foc ? ` · FOC ${r.foc}` : ""}
                    </div>
                  </div>
                  <div className="act">
                    <b>{STATUS[r.status].a}</b>
                    {r.nota}
                  </div>
                </li>
              ))
            ) : (
              <li>
                <span className="muted">Nenhum item precisa de ação.</span>
              </li>
            )}
          </ul>
        </div>
        <div className="panel">
          <h3>Itens em campo por diretoria</h3>
          <div className="sbars">
            {dirs.map((x) => {
              const rs = ativos.filter((r) => r.diretoria_id === x.id);
              const segs = ORDEM_STATUS.map((s) => ({ s, n: rs.filter((r) => r.status === s).length })).filter((y) => y.n);
              return (
                <div className="sbar" key={x.id}>
                  <span className="nm" title={x.nome}>
                    {x.nome}
                  </span>
                  <div className="track" style={{ width: `${(rs.length / max) * 100}%` }}>
                    {segs.map((y) => (
                      <div
                        key={y.s}
                        className={`seg ${y.s}`}
                        style={{ flex: y.n }}
                        data-tip={`${x.nome}: ${plural(y.n, "item", "itens")} · ${STATUS[y.s].l}`}
                      />
                    ))}
                  </div>
                  <span className="n">{rs.length}</span>
                </div>
              );
            })}
          </div>
          <div className="legend">
            {usados.map((s) => (
              <span key={s}>
                <i className={`seg ${s}`} style={{ minWidth: 0 }} />
                {STATUS[s].l}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="panel">
        <h3>Resumo por obra</h3>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Obra</th>
                <th>Diretoria</th>
                <th>Gestor</th>
                <th className="num">Em campo</th>
                <th className="num">Vencidos</th>
                <th className="num">Aditar / devolver</th>
                <th className="num">Custo mensal</th>
                <th className="num">Saldo das FOCs</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {porObra.length ? (
                porObra.map((x) => (
                  <tr key={x.id}>
                    <td>
                      <b>{x.nome}</b>
                    </td>
                    <td>{x.dir}</td>
                    <td>{x.gestor}</td>
                    <td className="num">{x.n}</td>
                    <td className="num">{x.v ? <Chip st="vencido">{x.v}</Chip> : "0"}</td>
                    <td className="num">{x.a ? <Chip st="aditar">{x.a}</Chip> : "0"}</td>
                    <td className="num">{brl(x.m)}</td>
                    <td className={`num ${x.sal < 0 ? "neg" : ""}`}>{brl(x.sal)}</td>
                    <td>
                      <button className="btn small" onClick={() => { setObraSel(x.id); irPara("obra"); }}>
                        Abrir
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="muted">
                    Nenhum item lançado com esses filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
