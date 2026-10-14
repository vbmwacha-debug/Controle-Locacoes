import { useState } from "react";
import { Chip, Kpi, opcoes } from "../components/comum";
import { useApp } from "../estado";
import { ENCARGOS, STATUS, type Encargo, type Quem } from "../lib/calc";
import { fmtData } from "../lib/datas";
import { brl, brl0, normalizar, ordemPt, plural } from "../lib/format";
import { FASES, QUEM_LABEL, TIPOS_USO, type ImovelDetalhes, type LocStatus } from "../lib/tipos";
import { ativo } from "./Painel";

export const encQuem = (m: ImovelDetalhes | undefined, k: Encargo): Quem =>
  ((m as unknown as Record<string, Quem>)?.[`${k}_quem`] ?? "na") as Quem;
export const encValor = (m: ImovelDetalhes | undefined, k: Encargo): number =>
  encQuem(m, k) === "ultra" ? Number((m as unknown as Record<string, number>)[`${k}_valor`]) || 0 : 0;

function CelulaEnc({ m, k }: { m?: ImovelDetalhes; k: Encargo }) {
  const q = encQuem(m, k);
  if (q === "na") return <span className="muted">—</span>;
  if (q === "ultra") return <>{brl(encValor(m, k))}</>;
  return <span className="tag soft">{q === "incluso" ? "incluso" : "locador"}</span>;
}

export default function Imoveis() {
  const { dados, abrirFicha, novoItem, setImportAberto, setObraSel } = useApp();
  const d = dados!;
  const [f, setF] = useState({ dir: "", obra: "", tipo: "", fase: "", pag: "", enc: "", quem: "", q: "" });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((o) => ({ ...o, [k]: e.target.value }));

  const todos = d.locacoes.filter((l) => l.e_imovel);
  const obrasIm = [...new Map(todos.map((l) => [l.obra_id, l.obra_nome])).entries()].sort((a, b) => ordemPt(a[1], b[1]));
  const m = (r: LocStatus) => d.imoveis.get(r.id);

  const rows = todos.filter((i) => {
    const x = m(i);
    if (f.dir && i.diretoria_id !== +f.dir) return false;
    if (f.obra && i.obra_id !== +f.obra) return false;
    if (f.tipo && x?.tipo_uso !== f.tipo) return false;
    if (f.fase && x?.fase !== f.fase) return false;
    if (f.pag && (x?.situacao_pagamento || "Em dia") !== f.pag) return false;
    if (f.enc || f.quem) {
      const ks = f.enc ? [f.enc as Encargo] : ENCARGOS.map((e) => e[0]);
      if (!ks.some((k) => (f.quem ? encQuem(x, k) === f.quem : encQuem(x, k) !== "na"))) return false;
    }
    if (f.q && !normalizar([i.fornecedor, i.descricao, x?.cidade_uf, x?.endereco, i.obra_nome].join(" ")).includes(normalizar(f.q))) return false;
    return true;
  });

  const encL = f.enc ? ENCARGOS.find((e) => e[0] === f.enc)![1] : "algum encargo";
  const at = rows.filter(ativo);
  const alug = at.reduce((s, r) => s + r.mensal_base, 0);
  const custo = at.reduce((s, r) => s + r.custo_mensal, 0);
  const atraso = at.filter((r) => m(r)?.situacao_pagamento === "Em atraso");
  const reaj = at.filter((r) => r.dias_reajuste !== null && r.dias_reajuste <= 60);
  const venc = at.filter((r) => r.status === "vencido");
  const somaEnc = (k: Encargo) => at.reduce((s, r) => s + encValor(m(r), k), 0);
  const partes: [string, number][] = [["Aluguel", alug], ...ENCARGOS.map(([k, l]) => [l, somaEnc(k)] as [string, number])];
  const mx = Math.max(1, ...partes.map((p) => p[1]));

  const att: { r: LocStatus; o: number; chip: JSX.Element; t: string }[] = [];
  at.forEach((r) => {
    if (r.status_ordem <= 4) att.push({ r, o: r.status_ordem, chip: <Chip st={r.status} />, t: r.nota });
    if (m(r)?.situacao_pagamento === "Em atraso")
      att.push({ r, o: 1.5, chip: <Chip st="vencido">Aluguel em atraso</Chip>, t: m(r)?.pendencias || "Ver pendências" });
    if (r.dias_reajuste !== null && r.dias_reajuste <= 60)
      att.push({ r, o: 5, chip: <Chip st="atencao">Reajuste</Chip>, t: `${m(r)?.indice_reajuste} em ${fmtData(r.proximo_reajuste)} (${r.dias_reajuste} dias)` });
  });
  att.sort((a, b) => a.o - b.o);

  return (
    <section className="view">
      <div className="bar">
        <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
          <h2>Imóveis locados</h2>
          <span className="muted">Clique em um imóvel para abrir a ficha completa.</span>
        </div>
        <div className="btnrow">
          <button className="btn" onClick={() => setImportAberto(true)}>
            Importar / exportar planilha
          </button>
          <button className="btn primary" onClick={() => { if (f.obra) setObraSel(+f.obra); novoItem(true); }}>
            + Novo imóvel
          </button>
        </div>
      </div>

      <div className="kpis">
        <Kpi l="Imóveis ativos" v={at.length} sub={`${at.reduce((s, r) => s + (Number(m(r)?.capacidade) || 0), 0)} vagas de alojamento`} />
        <Kpi l="Custo mensal total" v={brl0(custo)} sub={`${brl0(alug)} aluguel + ${brl0(custo - alug)} encargos`} />
        <Kpi tipo="crit" l="Aluguel em atraso" v={atraso.length} sub={`${plural(venc.length, "contrato vencido", "contratos vencidos")} sem cobertura`} />
        <Kpi tipo="serious" l="Reajuste em até 60 dias" v={reaj.length} sub="pelo aniversário do contrato" />
      </div>

      <div className="panel">
        <div className="filters">
          <div className="field">
            <label htmlFor="imDir">Diretoria</label>
            <select id="imDir" value={f.dir} onChange={set("dir")}>
              <option value="">Todas</option>
              {opcoes(d.diretorias.map((x) => [x.id, x.nome]))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="imObra">Obra / centro de custo</label>
            <select id="imObra" value={f.obra} onChange={set("obra")}>
              <option value="">Todas</option>
              {opcoes(obrasIm)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="imTipo">Tipo de uso</label>
            <select id="imTipo" value={f.tipo} onChange={set("tipo")}>
              <option value="">Todos</option>
              {opcoes(TIPOS_USO)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="imFase">Fase do contrato</label>
            <select id="imFase" value={f.fase} onChange={set("fase")}>
              <option value="">Todas</option>
              {opcoes(FASES)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="imPag">Pagamento</label>
            <select id="imPag" value={f.pag} onChange={set("pag")}>
              <option value="">Todos</option>
              {opcoes(["Em dia", "Em atraso"])}
            </select>
          </div>
          <div className="field">
            <label htmlFor="imEnc">Encargo</label>
            <select id="imEnc" value={f.enc} onChange={set("enc")}>
              <option value="">Qualquer encargo</option>
              {opcoes(ENCARGOS.map(([k, l]) => [k, l]))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="imQuem">Quem paga o encargo</label>
            <select id="imQuem" value={f.quem} onChange={set("quem")}>
              <option value="">Qualquer</option>
              {opcoes(Object.entries(QUEM_LABEL))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="imBusca">Buscar</label>
            <input id="imBusca" value={f.q} onChange={set("q")} placeholder="Locador, cidade, endereço" />
          </div>
          <p className="hint">
            {f.enc || f.quem
              ? `Mostrando imóveis em que ${encL} ${f.quem ? `está como “${QUEM_LABEL[f.quem as Quem]}”` : "existe (qualquer responsável)"}.`
              : "Combine Encargo + Quem paga para achar, por exemplo, todos os imóveis em que a Ultra paga IPTU ou em que o condomínio está incluso no aluguel."}
          </p>
        </div>
      </div>

      <div className="grid2">
        <div className="panel">
          <h3>Custo mensal por despesa (pago pela Ultra)</h3>
          <div className="ebars">
            {partes.map(([l, v]) => (
              <div className="ebar" key={l}>
                <span>{l}</span>
                <div className="t" style={{ width: `${(v / mx) * 100}%` }} data-tip={`${l}: ${brl(v)}/mês`} />
                <span className="v">{brl0(v)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <div className="bar">
            <h3>Atenção nos imóveis</h3>
            <span className="muted">{plural(att.length, "ponto", "pontos")}</span>
          </div>
          <ul className="alist" id="imAlist">
            {att.length ? (
              att.map((x, i) => (
                <li key={i}>
                  {x.chip}
                  <div style={{ minWidth: 0 }}>
                    <div className="what">
                      <button className="linkbtn" onClick={() => abrirFicha(x.r.id)}>
                        {x.r.descricao}
                      </button>
                    </div>
                    <div className="where">
                      {x.r.obra_nome} · {x.r.fornecedor}
                    </div>
                  </div>
                  <div className="act">{x.t}</div>
                </li>
              ))
            ) : (
              <li>
                <span className="muted">Nada pendente nos imóveis filtrados.</span>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="panel">
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Imóvel</th>
                <th>Obra / CC</th>
                <th>Diretoria</th>
                <th>Locador</th>
                <th>Fase</th>
                <th>Início</th>
                <th>Término</th>
                <th className="num">Aluguel</th>
                {ENCARGOS.map(([k, l]) => (
                  <th className="num" key={k}>
                    {l.replace(" (média)", "")}
                  </th>
                ))}
                <th className="num calc">Custo mensal</th>
                <th className="num">Venc.</th>
                <th>Pagamento</th>
                <th className="calc">Próx. reajuste</th>
                <th className="calc">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((r) => {
                  const x = m(r);
                  return (
                    <tr key={r.id} className={`click ${r.status === "encerrado" ? "done" : ""}`} onClick={() => abrirFicha(r.id)}>
                      <td>
                        <button className="linkbtn" onClick={(e) => { e.stopPropagation(); abrirFicha(r.id); }}>
                          {r.descricao}
                        </button>
                        <span className="note">
                          {x?.tipo_uso}
                          {x?.capacidade ? ` · ${x.capacidade} pessoas` : ""}
                        </span>
                      </td>
                      <td>{r.obra_nome}</td>
                      <td>{r.diretoria_nome}</td>
                      <td>
                        {r.fornecedor}
                        <span className="note">{x?.locador_tipo === "PJ" ? "Pessoa jurídica" : "Pessoa física"}</span>
                      </td>
                      <td>
                        <span className="tag soft">{x?.fase}</span>
                      </td>
                      <td>{fmtData(r.data_chegada)}</td>
                      <td>
                        <b>{fmtData(r.fim_contratual)}</b>
                      </td>
                      <td className="num">{brl(r.valor_unitario)}</td>
                      {ENCARGOS.map(([k]) => (
                        <td className="num" key={k}>
                          <CelulaEnc m={x} k={k} />
                        </td>
                      ))}
                      <td className="num calc">
                        <b>{brl(r.custo_mensal)}</b>
                      </td>
                      <td className="num">{x?.dia_vencimento ? `dia ${x.dia_vencimento}` : "—"}</td>
                      <td>{x?.situacao_pagamento === "Em atraso" ? <Chip st="vencido">Em atraso</Chip> : <Chip st="ok">Em dia</Chip>}</td>
                      <td>{r.proximo_reajuste ? fmtData(r.proximo_reajuste) : "—"}</td>
                      <td>
                        <Chip st={r.status}>{STATUS[r.status].l}</Chip>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={13 + ENCARGOS.length} className="muted">
                    {todos.length ? "Nenhum imóvel com esses filtros." : "Nenhum imóvel lançado ainda. Use “+ Novo imóvel” ou importe a planilha."}
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={7}>Total dos ativos filtrados ({at.length})</td>
                <td className="num">{brl(alug)}</td>
                {ENCARGOS.map(([k]) => (
                  <td className="num" key={k}>
                    {brl(somaEnc(k))}
                  </td>
                ))}
                <td className="num">{brl(custo)}</td>
                <td colSpan={4}></td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="muted" style={{ margin: 0 }}>
          Valores dos encargos são os pagos pela Ultra (água e energia pela média). "Incluso" = está no aluguel; "locador" = o
          proprietário paga.
        </p>
      </div>
    </section>
  );
}
