import { useEffect, useMemo, useState } from "react";
import { ChipAcao, Kpi, opcoes } from "../components/comum";
import { useApp } from "../estado";
import { buscarHistorico, buscarHistoricoTodo, contarHistorico, usuariosAtivosDesde, type FiltroHistorico } from "../lib/api";
import { addDias, fmtDataHora, hojeSP } from "../lib/datas";
import { exportarHistorico } from "../lib/excel";
import { ordemPt } from "../lib/format";
import { ACOES, type HistoricoLinha } from "../lib/tipos";

const POR_PAGINA = 100;

export default function Historico() {
  const { dados, abrirFicha, aviso } = useApp();
  const d = dados!;
  const [f, setF] = useState({ usuario: "", acao: "", obra: "", busca: "", de: "", ate: "" });
  const [buscaAtiva, setBuscaAtiva] = useState("");
  const [pagina, setPagina] = useState(0);
  const [linhas, setLinhas] = useState<HistoricoLinha[] | null>(null);
  const [total, setTotal] = useState(0);
  const [kpi, setKpi] = useState<{ hoje: number; ativos: number; aditivos: number } | null>(null);
  const [erro, setErro] = useState("");
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => {
    setF((o) => ({ ...o, [k]: e.target.value }));
    setPagina(0);
  };

  // espera o usuário parar de digitar na busca
  useEffect(() => {
    const t = setTimeout(() => setBuscaAtiva(f.busca), 350);
    return () => clearTimeout(t);
  }, [f.busca]);

  const filtro: FiltroHistorico = useMemo(
    () => ({ usuario: f.usuario, acao: f.acao, obraId: f.obra ? +f.obra : null, busca: buscaAtiva, de: f.de, ate: f.ate }),
    [f.usuario, f.acao, f.obra, buscaAtiva, f.de, f.ate],
  );

  useEffect(() => {
    let vivo = true;
    setLinhas(null);
    buscarHistorico(filtro, pagina, POR_PAGINA)
      .then((r) => {
        if (!vivo) return;
        setLinhas(r.linhas);
        setTotal(r.total);
        setErro("");
      })
      .catch((e) => vivo && setErro((e as Error).message));
    return () => {
      vivo = false;
    };
  }, [filtro, pagina, d]);

  useEffect(() => {
    const hoje = hojeSP();
    const seis = addDias(hoje, -6);
    Promise.all([
      contarHistorico({ de: hoje, ate: hoje, semEntradas: true }),
      usuariosAtivosDesde(seis),
      contarHistorico({ de: seis, acao: "solicitou aditivo" }),
    ])
      .then(([h, a, ad]) => setKpi({ hoje: h, ativos: a, aditivos: ad }))
      .catch(() => setKpi(null));
  }, [d]);

  const usuarios = d.usuarios.filter((u) => !u.unido_a_id).map((u) => u.nome).sort(ordemPt);
  const obras = [...d.obras].sort((a, b) => ordemPt(a.nome, b.nome));
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  async function exportar() {
    try {
      aviso("Gerando Excel do histórico…");
      await exportarHistorico(await buscarHistoricoTodo(filtro));
    } catch (e) {
      aviso("Não foi possível exportar: " + (e as Error).message);
    }
  }

  return (
    <section className="view">
      <div className="bar">
        <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
          <h2>Histórico de alterações</h2>
          <span className="muted">
            Tudo o que cada usuário fez no sistema, do mais recente para o mais antigo. Ninguém edita ou apaga este registro.
          </span>
        </div>
        <button className="btn" onClick={exportar}>
          Exportar Excel
        </button>
      </div>

      <div className="kpis">
        <Kpi l="Alterações hoje" v={kpi?.hoje ?? "…"} sub="sem contar entradas" />
        <Kpi l="Usuários ativos" v={kpi?.ativos ?? "…"} sub="nos últimos 7 dias" />
        <Kpi l="Aditivos solicitados" v={kpi?.aditivos ?? "…"} sub="nos últimos 7 dias" />
        <Kpi l="Registros" v={total} sub="com os filtros atuais" />
      </div>

      <div className="panel">
        <div className="filters">
          <div className="field">
            <label htmlFor="hUser">Usuário</label>
            <select id="hUser" value={f.usuario} onChange={set("usuario")}>
              <option value="">Todos</option>
              {opcoes(usuarios)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="hAcao">Ação</label>
            <select id="hAcao" value={f.acao} onChange={set("acao")}>
              <option value="">Todas</option>
              {opcoes(Object.entries(ACOES).map(([k, v]) => [k, v.l]))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="hObra">Obra / centro de custo</label>
            <select id="hObra" value={f.obra} onChange={set("obra")}>
              <option value="">Todas</option>
              {opcoes(obras.map((o) => [o.id, o.nome]))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="hBusca">Buscar</label>
            <input id="hBusca" value={f.busca} onChange={set("busca")} placeholder="Item, fornecedor, detalhe" />
          </div>
          <div className="field">
            <label htmlFor="hDe">De</label>
            <input id="hDe" type="date" value={f.de} onChange={set("de")} />
          </div>
          <div className="field">
            <label htmlFor="hAte">Até</label>
            <input id="hAte" type="date" value={f.ate} onChange={set("ate")} />
          </div>
        </div>
      </div>

      <div className="panel">
        {erro && <p className="erro">{erro}</p>}
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Data e hora</th>
                <th>Usuário</th>
                <th>Ação</th>
                <th>Item</th>
                <th>Obra</th>
                <th>O que mudou</th>
              </tr>
            </thead>
            <tbody>
              {!linhas ? (
                <tr>
                  <td colSpan={6} className="muted">
                    Carregando…
                  </td>
                </tr>
              ) : linhas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="muted">
                    Nenhum registro com esses filtros.
                  </td>
                </tr>
              ) : (
                linhas.map((r) => (
                  <tr key={r.id}>
                    <td>{fmtDataHora(r.em)}</td>
                    <td>
                      <b>{r.usuario}</b>
                    </td>
                    <td>
                      <ChipAcao acao={r.acao} />
                    </td>
                    <td>
                      {r.locacao_id ? (
                        <>
                          {r.e_imovel ? (
                            <button className="linkbtn" onClick={() => abrirFicha(r.locacao_id!)}>
                              {r.item_descricao}
                            </button>
                          ) : (
                            r.item_descricao
                          )}
                          <span className="note">Código {r.locacao_id}</span>
                        </>
                      ) : (
                        r.referencia || "—"
                      )}
                    </td>
                    <td>{r.obra_nome || "—"}</td>
                    <td className="det">{r.resumo || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="pager">
          <span>
            Página {pagina + 1} de {paginas} · {total} registros
          </span>
          <button className="btn small" disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)}>
            ← Mais recentes
          </button>
          <button className="btn small" disabled={pagina + 1 >= paginas} onClick={() => setPagina((p) => p + 1)}>
            Mais antigos →
          </button>
        </div>
      </div>
    </section>
  );
}
