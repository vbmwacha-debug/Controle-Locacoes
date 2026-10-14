import { useState, type FormEvent } from "react";
import { Campo, opcoes } from "../components/comum";
import { useAcao, useApp } from "../estado";
import { ordemPt } from "../lib/format";
import type { Obra } from "../lib/tipos";
import { ativo } from "./Painel";

export default function Obras() {
  const { dados, setObraSel, irPara } = useApp();
  const acao = useAcao();
  const d = dados!;
  const vazio = { id: null as number | null, nome: "", diretoria_id: "", gestor_nome: "", ativa: true };
  const [f, setF] = useState(vazio);
  const [aberto, setAberto] = useState(false);

  const editar = (o: Obra) => {
    setF({ id: o.id, nome: o.nome, diretoria_id: String(o.diretoria_id), gestor_nome: o.gestor_nome || "", ativa: o.ativa });
    setAberto(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  async function salvar(e: FormEvent) {
    e.preventDefault();
    const r = await acao<number>(
      "loc_salvar_obra",
      { p_id: f.id, p_nome: f.nome, p_diretoria_id: f.diretoria_id ? +f.diretoria_id : null, p_gestor_nome: f.gestor_nome, p_ativa: f.ativa },
      f.id ? "Obra atualizada." : "Obra cadastrada.",
    );
    if (r !== undefined) {
      setF(vazio);
      setAberto(false);
    }
  }

  const obras = [...d.obras].sort((a, b) => Number(b.ativa) - Number(a.ativa) || ordemPt(a.nome, b.nome));

  return (
    <section className="view">
      <div className="bar">
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <h2>Obras</h2>
          <span className="muted">Cada obra tem uma diretoria e um gestor responsável. Os itens locados são lançados dentro da obra.</span>
        </div>
        <button className="btn primary" onClick={() => { setF(vazio); setAberto(true); }}>
          + Nova obra
        </button>
      </div>

      {aberto && (
        <form className="panel" onSubmit={salvar} noValidate>
          <h2>{f.id ? "Editar obra" : "Nova obra"}</h2>
          <div className="form">
            <Campo id="o_nome" label="Nome da obra / centro de custo" obrig className="span2">
              <input id="o_nome" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} autoFocus />
            </Campo>
            <Campo id="o_dir" label="Diretoria" obrig>
              <select id="o_dir" value={f.diretoria_id} onChange={(e) => setF({ ...f, diretoria_id: e.target.value })}>
                <option value="">Escolha…</option>
                {opcoes(d.diretorias.filter((x) => x.ativo || String(x.id) === f.diretoria_id).map((x) => [x.id, x.nome]))}
              </select>
            </Campo>
            <Campo id="o_gestor" label="Gestor responsável">
              <input id="o_gestor" value={f.gestor_nome} onChange={(e) => setF({ ...f, gestor_nome: e.target.value })} placeholder="Nome e sobrenome" />
            </Campo>
            {f.id && (
              <Campo id="o_ativa" label="Situação">
                <select id="o_ativa" value={f.ativa ? "1" : "0"} onChange={(e) => setF({ ...f, ativa: e.target.value === "1" })}>
                  {opcoes([["1", "Ativa"], ["0", "Encerrada"]])}
                </select>
              </Campo>
            )}
          </div>
          <div className="formacts">
            <button type="button" className="btn" onClick={() => setAberto(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn primary">
              Salvar obra
            </button>
          </div>
        </form>
      )}

      <div className="panel">
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Obra</th>
                <th>Diretoria</th>
                <th>Gestor</th>
                <th className="num">Itens em campo</th>
                <th>Situação</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {obras.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted">
                    Nenhuma obra cadastrada. Clique em “+ Nova obra”.
                  </td>
                </tr>
              )}
              {obras.map((o) => (
                <tr key={o.id} className={o.ativa ? "" : "done"}>
                  <td>
                    <b>{o.nome}</b>
                  </td>
                  <td>{d.diretorias.find((x) => x.id === o.diretoria_id)?.nome}</td>
                  <td>{o.gestor_nome || "—"}</td>
                  <td className="num">{d.locacoes.filter((l) => l.obra_id === o.id && ativo(l)).length}</td>
                  <td>{o.ativa ? "Ativa" : "Encerrada"}</td>
                  <td>
                    <div className="acts">
                      <button className="btn small" onClick={() => editar(o)}>
                        Editar
                      </button>
                      <button className="btn small" onClick={() => { setObraSel(o.id); irPara("obra"); }}>
                        Lançamentos
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
