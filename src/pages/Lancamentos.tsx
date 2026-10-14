import { Fragment, useEffect, useState } from "react";
import { Chip, opcoes } from "../components/comum";
import ItemForm from "../components/ItemForm";
import { useAcao, useApp } from "../estado";
import { fmtData, hojeSP } from "../lib/datas";
import { exportarGeral } from "../lib/excel";
import { brl, n2, ordemPt, UNIDADE_LABEL } from "../lib/format";
import { ativo } from "./Painel";

type Pendente = { id: number; tipo: "aditivo" | "devolver"; data: string } | null;

export default function Lancamentos() {
  const { dados, obraSel, setObraSel, pedidoForm, limparPedidoForm, abrirFicha, setImportAberto, irPara, aviso } = useApp();
  const acao = useAcao();
  const d = dados!;
  const [form, setForm] = useState<{ id: number | null; imovel: boolean; n: number } | null>(null);
  const [pend, setPend] = useState<Pendente>(null);

  const obras = [...d.obras]
    .filter((o) => o.ativa || d.locacoes.some((l) => l.obra_id === o.id))
    .sort((a, b) => ordemPt(a.nome, b.nome));
  const obraId = obraSel && obras.some((o) => o.id === obraSel) ? obraSel : obras[0]?.id ?? null;
  const obra = d.obras.find((o) => o.id === obraId);
  const dir = d.diretorias.find((x) => x.id === obra?.diretoria_id);

  // pedido vindo de outra aba (Editar na ficha, + Novo imóvel)
  useEffect(() => {
    if (pedidoForm) {
      setForm(pedidoForm);
      limparPedidoForm();
      setTimeout(() => document.getElementById("formTopo")?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }, [pedidoForm, limparPedidoForm]);

  const rs = d.locacoes
    .filter((l) => l.obra_id === obraId)
    .sort((a, b) => Number(a.status === "encerrado") - Number(b.status === "encerrado") || a.id - b.id);
  const itemForm = form?.id ? d.locacoes.find((l) => l.id === form.id) ?? null : null;

  async function confirmar() {
    if (!pend) return;
    if (pend.tipo === "aditivo") {
      await acao("loc_solicitar_aditivo", { p_id: pend.id }, "Aditivo registrado. Acompanhe com Suprimentos.");
    } else {
      await acao("loc_devolver", { p_id: pend.id, p_data: pend.data }, `Devolução registrada em ${fmtData(pend.data)}.`);
    }
    setPend(null);
  }

  if (!obras.length) {
    return (
      <section className="view">
        <div className="panel semdados">
          <p style={{ margin: 0 }}>Nenhuma obra cadastrada ainda.</p>
          <div>
            <button className="btn primary" onClick={() => irPara("obras")}>
              Cadastrar obra
            </button>{" "}
            <button className="btn" onClick={() => setImportAberto(true)}>
              Importar planilha
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="view">
      <div className="bar">
        <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
          <h2>{obra?.nome ?? "Lançamentos da obra"}</h2>
          <span className="muted">
            {dir?.nome} · Gestor: {obra?.gestor_nome || "—"} · {rs.filter(ativo).length} itens em campo
          </span>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "end", flexWrap: "wrap" }}>
          <div className="field" style={{ width: 260 }}>
            <label htmlFor="fObra">Obra</label>
            <select id="fObra" value={obraId ?? ""} onChange={(e) => { setObraSel(Number(e.target.value)); setForm(null); }}>
              {opcoes(obras.map((o) => [o.id, o.nome + (o.ativa ? "" : " (encerrada)")]))}
            </select>
          </div>
          <button className="btn" onClick={() => setImportAberto(true)}>
            Importar / exportar planilha
          </button>
          <button className="btn" onClick={() => exportarGeral(rs, obra?.nome || "Obra").catch((e) => aviso((e as Error).message))}>
            Exportar Excel
          </button>
          <button className="btn primary" onClick={() => setForm({ id: null, imovel: false, n: Date.now() })}>
            + Novo item locado
          </button>
        </div>
      </div>

      <div id="formTopo" />
      {form && (
        <ItemForm
          key={form.n}
          item={itemForm}
          comoImovel={form.imovel}
          obraId={obraId}
          onFechar={() => setForm(null)}
        />
      )}

      {/* celular: cartões */}
      <div className="cards-obra">
        {rs.length === 0 && <div className="panel muted">Nenhum item lançado nesta obra.</div>}
        {rs.map((r) => (
          <div key={r.id} className={`panel cartao ${r.status === "encerrado" ? "done" : ""}`}>
            <div className="cartao-topo">
              <div style={{ minWidth: 0 }}>
                {r.e_imovel ? (
                  <button className="linkbtn" onClick={() => abrirFicha(r.id)}>
                    {r.descricao}
                  </button>
                ) : (
                  <b>{r.descricao}</b>
                )}
                <span className="note">
                  Código {r.id} · {r.fornecedor} · FOC {r.foc || "—"}
                </span>
              </div>
              <Chip st={r.status} />
            </div>
            <span className="muted">{r.nota}</span>
            <div className="cartao-nums">
              <span>Fim contratual <b>{fmtData(r.fim_contratual)}</b></span>
              <span>Previsão de saída <b>{fmtData(r.previsao_saida)}</b></span>
              <span>Saldo <b className={r.saldo < 0 ? "negtxt" : ""}>{brl(r.saldo)}</b></span>
              <span>Custo mensal <b>{brl(r.custo_mensal)}</b></span>
            </div>
            <div className="acts" style={{ flexWrap: "wrap" }}>
              <button className="btn small" onClick={() => { setForm({ id: r.id, imovel: r.e_imovel, n: Date.now() }); setTimeout(() => document.getElementById("formTopo")?.scrollIntoView({ behavior: "smooth" }), 50); }}>
                {r.status === "encerrado" ? "Ver" : "Editar"}
              </button>
              {r.status !== "encerrado" && r.aditivo_status !== "solicitado" && (
                <button className="btn small" onClick={() => setPend({ id: r.id, tipo: "aditivo", data: hojeSP() })}>
                  Solicitar aditivo
                </button>
              )}
              {r.status !== "encerrado" && (
                <button className="btn small" onClick={() => setPend({ id: r.id, tipo: "devolver", data: hojeSP() })}>
                  Devolver
                </button>
              )}
            </div>
            {pend?.id === r.id && (
              <div className="confirm" role="alertdialog" aria-label="Confirmação">
                {pend.tipo === "aditivo" ? (
                  <span>Registrar que o aditivo foi solicitado a Suprimentos hoje?</span>
                ) : (
                  <>
                    <span>Devolução em</span>
                    <input type="date" aria-label="Data da devolução" value={pend.data} min={r.data_chegada} onChange={(e) => setPend({ ...pend, data: e.target.value })} />
                    <span>?</span>
                  </>
                )}
                <button className="btn small primary" onClick={confirmar}>
                  Confirmar
                </button>
                <button className="btn small" onClick={() => setPend(null)}>
                  Cancelar
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="panel tabela-obra">
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Descrição</th>
                <th>Fornecedor</th>
                <th>FOC</th>
                <th>FTC</th>
                <th className="num">Qtd.</th>
                <th className="num">Prazo</th>
                <th>Unid.</th>
                <th className="num">Valor unit.</th>
                <th className="num calc">Valor total FOC</th>
                <th>Chegada</th>
                <th className="calc">Fim contratual</th>
                <th>Previsão saída</th>
                <th className="num calc">Usados</th>
                <th className="num calc">Saldo</th>
                <th className="calc">Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rs.length === 0 && (
                <tr>
                  <td colSpan={17} className="muted">
                    Nenhum item lançado nesta obra. Use "+ Novo item locado" ou importe a planilha.
                  </td>
                </tr>
              )}
              {rs.map((r, k) => (
                <Fragment key={r.id}>
                  <tr className={r.status === "encerrado" ? "done" : ""}>
                    <td>{k + 1}</td>
                    <td>
                      {r.e_imovel ? (
                        <>
                          <button className="linkbtn" onClick={() => abrirFicha(r.id)}>
                            {r.descricao}
                          </button>{" "}
                          <span className="tag">Imóvel</span>
                        </>
                      ) : (
                        <b>{r.descricao}</b>
                      )}
                      <span className="note">
                        Código {r.id} · {r.categoria_nome}
                        {r.observacoes ? " · " + r.observacoes : ""}
                      </span>
                    </td>
                    <td>{r.fornecedor}</td>
                    <td>{r.foc}</td>
                    <td>{r.ftc}</td>
                    <td className="num">{n2(r.quantidade)}</td>
                    <td className="num">{n2(r.prazo_calculado)}</td>
                    <td>{UNIDADE_LABEL[r.e_imovel ? "mes" : r.unidade]}</td>
                    <td className="num">{brl(r.valor_unitario)}</td>
                    <td className="num calc">{brl(r.valor_total_foc)}</td>
                    <td>{fmtData(r.data_chegada)}</td>
                    <td className="calc">
                      <b>{fmtData(r.fim_contratual)}</b>
                    </td>
                    <td>{fmtData(r.previsao_saida)}</td>
                    <td className="num calc">{n2(r.periodos_usados)}</td>
                    <td className={`num calc ${r.saldo < 0 ? "neg" : ""}`}>{brl(r.saldo)}</td>
                    <td>
                      <Chip st={r.status} />
                      <span className="note">{r.nota}</span>
                    </td>
                    <td>
                      <div className="acts">
                        {r.status === "encerrado" ? (
                          <button className="btn small" onClick={() => setForm({ id: r.id, imovel: r.e_imovel, n: Date.now() })}>
                            Ver
                          </button>
                        ) : (
                          <>
                            {r.e_imovel && (
                              <button className="btn small" onClick={() => abrirFicha(r.id)}>
                                Ficha
                              </button>
                            )}
                            <button className="btn small" onClick={() => { setForm({ id: r.id, imovel: r.e_imovel, n: Date.now() }); setTimeout(() => document.getElementById("formTopo")?.scrollIntoView({ behavior: "smooth" }), 50); }}>
                              Editar
                            </button>
                            {r.aditivo_status !== "solicitado" && (
                              <button className="btn small" onClick={() => setPend({ id: r.id, tipo: "aditivo", data: hojeSP() })}>
                                Solicitar aditivo
                              </button>
                            )}
                            <button className="btn small" onClick={() => setPend({ id: r.id, tipo: "devolver", data: hojeSP() })}>
                              Devolver
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  {pend?.id === r.id && (
                    <tr>
                      <td colSpan={17}>
                        <div className="confirm" role="alertdialog" aria-label="Confirmação">
                          {pend.tipo === "aditivo" ? (
                            <span>
                              Registrar que o aditivo de <b>{r.descricao}</b> foi solicitado a Suprimentos hoje? O contrato vence em{" "}
                              {fmtData(r.fim_contratual)}.
                            </span>
                          ) : (
                            <>
                              <span>
                                Registrar a devolução de <b>{r.descricao}</b> em
                              </span>
                              <input
                                type="date"
                                aria-label="Data da devolução"
                                value={pend.data}
                                min={r.data_chegada}
                                onChange={(e) => setPend({ ...pend, data: e.target.value })}
                              />
                              <span>? O item sai do painel e o cálculo congela nessa data.</span>
                            </>
                          )}
                          <button className="btn small primary" onClick={confirmar} autoFocus>
                            Confirmar
                          </button>
                          <button className="btn small" onClick={() => setPend(null)}>
                            Cancelar
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ margin: 0 }}>
          Períodos usados e saldo são calculados até hoje (ou até a devolução). Saldo negativo significa que o item já consumiu mais
          do que a FOC cobre.
        </p>
      </div>
    </section>
  );
}
