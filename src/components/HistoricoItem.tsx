import { useEffect, useState } from "react";
import { useApp } from "../estado";
import { buscarHistorico } from "../lib/api";
import { fmtDataHora } from "../lib/datas";
import type { HistoricoLinha } from "../lib/tipos";
import { ChipAcao } from "./comum";

/** Histórico de um único item (ficha do imóvel e edição). */
export default function HistoricoItem({ id }: { id: number }) {
  const { dados } = useApp();
  const [linhas, setLinhas] = useState<HistoricoLinha[] | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let vivo = true;
    buscarHistorico({ locacaoId: id }, 0, 50)
      .then((r) => vivo && setLinhas(r.linhas))
      .catch((e) => vivo && setErro((e as Error).message));
    return () => {
      vivo = false;
    };
    // recarrega quando os dados mudam (depois de salvar)
  }, [id, dados]);

  return (
    <div className="panel">
      <h3>Histórico deste item</h3>
      {erro && <p className="erro">{erro}</p>}
      {!linhas ? (
        <span className="muted">Carregando…</span>
      ) : linhas.length === 0 ? (
        <span className="muted">Sem registros.</span>
      ) : (
        <ul className="hlist">
          {linhas.map((h) => (
            <li key={h.id}>
              <span>
                <ChipAcao acao={h.acao} /> <b>{h.usuario}</b> <span className="quando">· {fmtDataHora(h.em)}</span>
              </span>
              {h.resumo && <span>{h.resumo}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
