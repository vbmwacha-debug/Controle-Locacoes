import type { ReactNode } from "react";
import { useApp } from "../estado";
import { ENCARGOS } from "../lib/calc";
import { fmtData } from "../lib/datas";
import { brl, n2 } from "../lib/format";
import { QUEM_LABEL } from "../lib/tipos";
import { encQuem, encValor } from "../pages/Imoveis";
import { Chip, Drawer } from "./comum";
import HistoricoItem from "./HistoricoItem";

function Lista({ pares }: { pares: [string, ReactNode][] }) {
  const v = pares.filter(([, b]) => b !== "" && b != null);
  return (
    <dl className="dl">
      {v.map(([a, b]) => (
        <FragmentPar key={a} a={a} b={b} />
      ))}
    </dl>
  );
}
const FragmentPar = ({ a, b }: { a: string; b: ReactNode }) => (
  <>
    <dt>{a}</dt>
    <dd>{b}</dd>
  </>
);

/** Ficha do imóvel em painel lateral. Mostra os dados pessoais do locador (só aqui e na exportação de imóveis). */
export default function FichaImovel() {
  const { dados, fichaId, fecharFicha, editarItem } = useApp();
  const it = fichaId ? dados?.locacoes.find((l) => l.id === fichaId) : undefined;
  const m = it ? dados?.imoveis.get(it.id) : undefined;

  return (
    <Drawer aberto={!!it && !!m} onFechar={fecharFicha} rotulo="Ficha do imóvel">
      {it && m && (
        <>
          <div className="dhead">
            <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
              <span className="tag" style={{ alignSelf: "flex-start" }}>
                Ficha do imóvel · Código {it.id}
              </span>
              <h2>{it.descricao}</h2>
              <span className="sub">
                {it.obra_nome} · Diretoria {it.diretoria_nome} · {it.gestor_nome || "sem gestor"}
              </span>
            </div>
            <button className="btn small" onClick={fecharFicha} aria-label="Fechar ficha">
              Fechar
            </button>
          </div>
          <div className="chips">
            <Chip st={it.status} />
            <span className="tag soft">Fase: {m.fase}</span>
            {m.situacao_pagamento === "Em atraso" ? <Chip st="vencido">Aluguel em atraso</Chip> : <Chip st="ok">Aluguel em dia</Chip>}
          </div>
          <p className="muted" style={{ margin: 0 }}>
            {it.nota}
            {it.acao ? " · " + it.acao : ""}
          </p>
          <div className="figs">
            <div className="fig">
              <span className="l">Custo mensal para a Ultra</span>
              <span className="v">{brl(it.custo_mensal)}</span>
              <span className="s">
                {brl(it.mensal_base)} aluguel + {brl(it.encargos_ultra)} encargos
              </span>
            </div>
            <div className="fig">
              <span className="l">Término do contrato</span>
              <span className="v">{fmtData(it.fim_contratual)}</span>
              <span className="s">
                {it.dias_fim === null ? "" : it.dias_fim >= 0 ? `faltam ${it.dias_fim} dias` : `vencido há ${-it.dias_fim} dias`}
              </span>
            </div>
            <div className="fig">
              <span className="l">Próximo reajuste</span>
              <span className="v">{it.proximo_reajuste ? fmtData(it.proximo_reajuste) : "—"}</span>
              <span className="s">
                {m.indice_reajuste}
                {it.dias_reajuste !== null ? ` · em ${it.dias_reajuste} dias` : ""}
              </span>
            </div>
            <div className="fig">
              <span className="l">Avisar o locador até</span>
              <span className="v">{it.avisar_locador_ate ? fmtData(it.avisar_locador_ate) : "—"}</span>
              <span className="s">
                {m.aviso_previo_dias ? `${m.aviso_previo_dias} dias de aviso · saída ${fmtData(it.previsao_saida)}` : "sem aviso prévio cadastrado"}
              </span>
            </div>
          </div>
          <div className="panel">
            <h3>Custos mensais</h3>
            <div className="tw">
              <table>
                <thead>
                  <tr>
                    <th>Despesa</th>
                    <th>Quem paga</th>
                    <th className="num">R$/mês</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Aluguel</td>
                    <td>Ultra paga</td>
                    <td className="num">{brl(it.valor_unitario)}</td>
                  </tr>
                  {ENCARGOS.map(([k, l]) => (
                    <tr key={k}>
                      <td>{l}</td>
                      <td>{QUEM_LABEL[encQuem(m, k)]}</td>
                      <td className="num">{encQuem(m, k) === "ultra" ? brl(encValor(m, k)) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2}>Total pago pela Ultra</td>
                    <td className="num">{brl(it.custo_mensal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {m.outros_inclusos && (
              <p className="muted" style={{ margin: 0 }}>
                Também incluso no aluguel: {m.outros_inclusos}
              </p>
            )}
          </div>
          <div className="panel">
            <h3>Pagamento</h3>
            <Lista
              pares={[
                ["Dia de vencimento", m.dia_vencimento ? `Dia ${m.dia_vencimento}` : "—"],
                ["Situação", m.situacao_pagamento || "Em dia"],
                ["Pendências", m.pendencias || ""],
                ["Multa por atraso", m.multa_atraso || ""],
              ]}
            />
          </div>
          <div className="panel">
            <h3>Contrato</h3>
            <Lista
              pares={[
                ["FTC", it.ftc || ""],
                ["Nº cotação / MC", m.numero_cotacao || ""],
                ["FOC", it.foc || "—"],
                ["Início", fmtData(it.data_chegada)],
                ["Término", fmtData(it.fim_contratual)],
                ["Prazo", `${n2(it.prazo_calculado)} meses`],
                ["Valor total do contrato", brl(it.valor_total_foc)],
                ["Saldo hoje", <span style={it.saldo < 0 ? { color: "var(--s-crit)" } : undefined}>{brl(it.saldo)}</span>],
                ["Previsão de saída", fmtData(it.previsao_saida)],
                ["Aditivo", it.aditivo_status === "solicitado" ? `Solicitado em ${fmtData(it.aditivo_data)}` : "Não solicitado"],
                ["Reajuste", m.indice_reajuste || ""],
                ["Garantia", (m.garantia || "") + (m.valor_garantia ? ` · ${brl(m.valor_garantia)}` : "")],
                ["Rescisão sem multa após", m.rescisao_sem_multa_apos_meses != null ? `${m.rescisao_sem_multa_apos_meses} meses` : ""],
                ["Aviso prévio", m.aviso_previo_dias ? `${m.aviso_previo_dias} dias` : ""],
              ]}
            />
          </div>
          <div className="panel">
            <h3>Imóvel</h3>
            <Lista
              pares={[
                ["Tipo de uso", m.tipo_uso || ""],
                ["Endereço", m.endereco || ""],
                ["Cidade/UF", m.cidade_uf || ""],
                ["Capacidade", m.capacidade ? `${m.capacidade} pessoas` : ""],
                ["Alojados / uso", m.alojados || ""],
              ]}
            />
          </div>
          <div className="panel">
            <h3>Locador</h3>
            <Lista
              pares={[
                ["Nome", it.fornecedor],
                ["Tipo", m.locador_tipo === "PJ" ? "Pessoa jurídica" : "Pessoa física"],
                ["CPF / CNPJ", m.locador_documento || ""],
                ["E-mail", m.locador_email || ""],
                ["Telefone", m.locador_telefone || ""],
              ]}
            />
          </div>
          {it.observacoes && (
            <div className="panel">
              <h3>Observações</h3>
              <p style={{ margin: 0 }}>{it.observacoes}</p>
            </div>
          )}
          <div className="formacts">
            <button className="btn primary" onClick={() => editarItem(it.id)}>
              Editar imóvel
            </button>
          </div>
          <HistoricoItem id={it.id} />
        </>
      )}
    </Drawer>
  );
}
