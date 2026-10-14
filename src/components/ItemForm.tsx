import { useMemo, useRef, useState, type FormEvent } from "react";
import { useAcao, useApp } from "../estado";
import { calc, CAT_IMOVEL, ENCARGOS, STATUS, type CalcInput, type Quem, type Unidade } from "../lib/calc";
import { hojeSP } from "../lib/datas";
import { brl, normalizar, ordemPt } from "../lib/format";
import { FASES, GARANTIAS, INDICES, PAGAMENTOS, QUEM_LABEL, TIPOS_USO, type ImovelDetalhes, type LocStatus } from "../lib/tipos";
import { Campo, Chip, opcoes } from "./comum";
import HistoricoItem from "./HistoricoItem";

type F = Record<string, string>;
const OUTRO = "__outro";

const IM_CAMPOS = [
  "fase", "numero_cotacao", "tipo_uso", "capacidade", "endereco", "cidade_uf", "locador_tipo", "locador_documento",
  "locador_email", "locador_telefone", "alojados", "outros_inclusos", "dia_vencimento", "situacao_pagamento",
  "pendencias", "indice_reajuste", "garantia", "valor_garantia", "aviso_previo_dias", "rescisao_sem_multa_apos_meses",
  "multa_atraso",
];
const IM_NUM = ["capacidade", "dia_vencimento", "valor_garantia", "aviso_previo_dias", "rescisao_sem_multa_apos_meses"];

const s = (v: unknown) => (v == null ? "" : String(v));

function inicial(item: LocStatus | null, im: ImovelDetalhes | undefined, obraId: number | null, catId: string): F {
  const hoje = hojeSP();
  const f: F = {
    obra_id: s(item?.obra_id ?? obraId),
    categoria: s(item?.categoria_id ?? catId),
    catnova: "",
    descricao: s(item?.descricao),
    fornecedor: s(item?.fornecedor),
    foc: s(item?.foc),
    ftc: s(item?.ftc),
    quantidade: s(item?.quantidade ?? 1),
    valor_unitario: s(item?.valor_unitario),
    unidade: s(item?.unidade ?? "mes"),
    prazo: s(item?.prazo),
    data_chegada: s(item?.data_chegada ?? hoje),
    termino_contrato: s(im?.termino_contrato),
    previsao_saida: s(item?.previsao_saida),
    aditivo_status: s(item?.aditivo_status),
    aditivo_data: s(item?.aditivo_data),
    data_devolucao: s(item?.data_devolucao),
    observacoes: s(item?.observacoes),
    // padrões do imóvel
    fase: "Ativo", tipo_uso: TIPOS_USO[0], locador_tipo: "PF", situacao_pagamento: "Em dia",
    indice_reajuste: "IGP-M", garantia: "Caução", aviso_previo_dias: "30", rescisao_sem_multa_apos_meses: "12",
  };
  ENCARGOS.forEach(([k]) => {
    f[`${k}_quem`] = "na";
    f[`${k}_valor`] = "";
  });
  if (im) {
    IM_CAMPOS.forEach((k) => (f[k] = s((im as unknown as Record<string, unknown>)[k])));
    ENCARGOS.forEach(([k]) => {
      const r = im as unknown as Record<string, unknown>;
      f[`${k}_quem`] = s(r[`${k}_quem`] || "na");
      f[`${k}_valor`] = r[`${k}_quem`] === "ultra" ? s(r[`${k}_valor`]) : "";
    });
  }
  return f;
}

const num = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));

export default function ItemForm({ item, comoImovel, obraId, onFechar }: {
  item: LocStatus | null; comoImovel: boolean; obraId: number | null; onFechar: () => void;
}) {
  const { dados, catImovelId, aviso } = useApp();
  const acao = useAcao();
  const d = dados!;
  const im = item ? d.imoveis.get(item.id) : undefined;
  const catPadrao = comoImovel && catImovelId ? String(catImovelId) : "";
  const [f, setF] = useState<F>(() => inicial(item, im, obraId, catPadrao));
  const [faltando, setFaltando] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const set = (k: string, v: string) => setF((o) => ({ ...o, [k]: v }));
  const bind = (k: string) => ({ id: "i_" + k, value: f[k] ?? "", onChange: (e: { target: { value: string } }) => set(k, e.target.value) });

  const categorias = useMemo(() => [...d.categorias].sort((a, b) => ordemPt(a.nome, b.nome)), [d.categorias]);
  const ehImovel = f.categoria !== OUTRO && d.categorias.find((c) => String(c.id) === f.categoria)?.nome === CAT_IMOVEL;
  const obras = d.obras.filter((o) => o.ativa || String(o.id) === f.obra_id).sort((a, b) => ordemPt(a.nome, b.nome));

  const entradaCalc: CalcInput = {
    quantidade: num(f.quantidade) ?? 0,
    valor_unitario: num(f.valor_unitario) ?? 0,
    unidade: f.unidade as Unidade,
    prazo: num(f.prazo) ?? 0,
    data_chegada: f.data_chegada || null,
    previsao_saida: f.previsao_saida || null,
    aditivo_status: f.aditivo_status,
    aditivo_data: f.aditivo_data || null,
    data_devolucao: f.data_devolucao || null,
    imovel: ehImovel
      ? {
          termino_contrato: f.termino_contrato || null,
          fase: f.fase,
          aviso_previo_dias: num(f.aviso_previo_dias),
          indice_reajuste: f.indice_reajuste,
          encargos: Object.fromEntries(ENCARGOS.map(([k]) => [k, { quem: f[`${k}_quem`] as Quem, valor: num(f[`${k}_valor`]) }])),
        }
      : null,
  };
  const podePrever = ehImovel ? f.data_chegada && f.termino_contrato : f.data_chegada && num(f.prazo);
  const c = podePrever ? calc(entradaCalc, hojeSP()) : null;

  function obrigatorios(): [string, string][] {
    const L: [string, string][] = [
      ["obra_id", "Obra"],
      ["categoria", "Categoria"],
      ["descricao", "Descrição"],
      ["fornecedor", ehImovel ? "Locador" : "Fornecedor"],
      ["valor_unitario", ehImovel ? "Aluguel mensal" : "Valor unitário"],
      ["data_chegada", ehImovel ? "Início da locação" : "Data de chegada"],
      ["previsao_saida", "Previsão de saída"],
    ];
    if (ehImovel) {
      L.push(["termino_contrato", "Término do contrato"]);
      if (f.fase !== "Mobilizar") L.push(["foc", "FOC"]);
    } else {
      L.push(["foc", "FOC"], ["quantidade", "Quantidade"], ["prazo", "Prazo contratado"]);
    }
    if (f.categoria === OUTRO) L.push(["catnova", "Nova categoria"]);
    return L;
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    const falta = obrigatorios().filter(([k]) => !String(f[k] ?? "").trim() || ((k === "quantidade" || k === "prazo") && !(num(f[k])! > 0)));
    setFaltando(falta.map(([k]) => k));
    if (falta.length) {
      aviso("Preencha: " + falta.map(([, l]) => l).join(", "));
      formRef.current?.querySelector<HTMLElement>("#i_" + falta[0][0])?.focus();
      return;
    }
    let categoriaNova = "";
    let categoriaId: number | null = f.categoria === OUTRO ? null : Number(f.categoria);
    if (f.categoria === OUTRO) {
      const ex = d.categorias.find((x) => normalizar(x.nome) === normalizar(f.catnova));
      if (ex) categoriaId = ex.id;
      else categoriaNova = f.catnova.trim();
    }
    const imovel = ehImovel
      ? Object.fromEntries([
          ["termino_contrato", f.termino_contrato],
          ...IM_CAMPOS.map((k) => [k, IM_NUM.includes(k) ? num(f[k]) : f[k].trim() || null]),
          ...ENCARGOS.flatMap(([k]) => [[`${k}_quem`, f[`${k}_quem`]], [`${k}_valor`, f[`${k}_quem`] === "ultra" ? num(f[`${k}_valor`]) : null]]),
        ])
      : null;
    const p_dados = {
      id: item?.id ?? null,
      obra_id: Number(f.obra_id),
      categoria_id: categoriaId,
      categoria_nova: categoriaNova || null,
      descricao: f.descricao,
      fornecedor: f.fornecedor,
      foc: f.foc,
      ftc: f.ftc,
      quantidade: num(f.quantidade),
      valor_unitario: num(f.valor_unitario),
      unidade: f.unidade,
      prazo: num(f.prazo),
      data_chegada: f.data_chegada,
      previsao_saida: f.previsao_saida || null,
      aditivo_status: f.aditivo_status,
      aditivo_data: f.aditivo_data || null,
      data_devolucao: f.data_devolucao || null,
      observacoes: f.observacoes,
      imovel,
    };
    setSalvando(true);
    const msg = item
      ? "Item atualizado."
      : categoriaNova
        ? `Item incluído. Categoria "${categoriaNova}" gravada na lista para todos.`
        : f.categoria !== OUTRO || !f.catnova
          ? "Item incluído."
          : "Item incluído. A categoria já existia; usei a existente.";
    const r = await acao<number>("loc_salvar_locacao", { p_dados }, msg);
    setSalvando(false);
    if (r !== undefined) onFechar();
  }

  const inv = (k: string) => faltando.includes(k);
  const devolvido = !!item?.data_devolucao;

  return (
    <>
      <form className="panel" ref={formRef} onSubmit={salvar} noValidate>
        <div className="bar">
          <h2>{item ? (devolvido ? "Item encerrado" : "Editar item") : ehImovel ? "Novo imóvel" : "Novo item locado"}</h2>
          <span className="muted">Campos com * são obrigatórios · ƒ são calculados</span>
        </div>
        <div className={`form ${ehImovel ? "mode-im" : ""}`}>
          <div className="sec">Obra e categoria</div>
          <Campo id="i_obra_id" label={ehImovel ? "Obra / centro de custo" : "Obra"} obrig invalido={inv("obra_id")} className="span2">
            <select {...bind("obra_id")}>
              <option value="">Escolha…</option>
              {opcoes(obras.map((o) => [o.id, o.nome]))}
            </select>
          </Campo>
          <Campo id="i_categoria" label="Categoria" obrig invalido={inv("categoria")} className="span2">
            <select {...bind("categoria")}>
              <option value="">Escolha…</option>
              {opcoes(categorias.map((x) => [x.id, x.nome]))}
              <option value={OUTRO}>Outro (escrever)</option>
            </select>
          </Campo>
          {f.categoria === OUTRO && (
            <Campo id="i_catnova" label="Nova categoria" obrig invalido={inv("catnova")} className="span2">
              <input {...bind("catnova")} placeholder="Escreva a categoria" autoFocus />
            </Campo>
          )}

          <div className="sec">Item e contrato</div>
          <Campo id="i_descricao" label="Descrição" obrig invalido={inv("descricao")} className="full">
            <input {...bind("descricao")} placeholder={ehImovel ? "Ex.: Alojamento operacional — Araxá/MG" : "Ex.: Container escritório 6,00x2,40m"} />
          </Campo>
          <Campo id="i_fornecedor" label={ehImovel ? "Locador" : "Fornecedor"} obrig invalido={inv("fornecedor")}>
            <input {...bind("fornecedor")} />
          </Campo>
          <Campo id="i_foc" label="FOC (ordem de compra)" obrig={!ehImovel || f.fase !== "Mobilizar"} invalido={inv("foc")}>
            <input {...bind("foc")} />
          </Campo>
          <Campo id="i_ftc" label="FTC">
            <input {...bind("ftc")} />
          </Campo>
          {!ehImovel && (
            <Campo id="i_quantidade" label="Quantidade" obrig invalido={inv("quantidade")}>
              <input {...bind("quantidade")} type="number" min="0" step="0.01" inputMode="decimal" />
            </Campo>
          )}
          <Campo id="i_valor_unitario" label={ehImovel ? "Aluguel mensal (R$)" : "Valor unitário (R$)"} obrig invalido={inv("valor_unitario")}>
            <input {...bind("valor_unitario")} type="number" min="0" step="0.01" inputMode="decimal" />
          </Campo>
          {!ehImovel && (
            <>
              <Campo id="i_unidade" label="Unidade" obrig>
                <select {...bind("unidade")}>{opcoes([["mes", "Mês"], ["semana", "Semana"], ["dia", "Dia"]])}</select>
              </Campo>
              <Campo id="i_prazo" label="Prazo contratado" obrig invalido={inv("prazo")}>
                <input {...bind("prazo")} type="number" min="0" step="1" inputMode="decimal" />
              </Campo>
            </>
          )}
          <Campo id="i_data_chegada" label={ehImovel ? "Início da locação" : "Data de chegada na obra"} obrig invalido={inv("data_chegada")}>
            <input {...bind("data_chegada")} type="date" />
          </Campo>
          {ehImovel && (
            <Campo id="i_termino_contrato" label="Término do contrato" obrig invalido={inv("termino_contrato")}>
              <input {...bind("termino_contrato")} type="date" />
            </Campo>
          )}

          {ehImovel && (
            <>
              <div className="sec">Imóvel e locador</div>
              <Campo id="i_tipo_uso" label="Tipo de uso">
                <select {...bind("tipo_uso")}>{opcoes(TIPOS_USO)}</select>
              </Campo>
              <Campo id="i_fase" label="Fase do contrato">
                <select {...bind("fase")}>{opcoes(FASES)}</select>
              </Campo>
              <Campo id="i_numero_cotacao" label="Nº cotação / MC">
                <input {...bind("numero_cotacao")} />
              </Campo>
              <Campo id="i_capacidade" label="Capacidade (pessoas)">
                <input {...bind("capacidade")} type="number" min="0" step="1" inputMode="numeric" />
              </Campo>
              <Campo id="i_endereco" label="Endereço" className="span2">
                <input {...bind("endereco")} />
              </Campo>
              <Campo id="i_cidade_uf" label="Cidade/UF">
                <input {...bind("cidade_uf")} placeholder="Ex.: Araxá/MG" />
              </Campo>
              <Campo id="i_locador_tipo" label="Locador é">
                <select {...bind("locador_tipo")}>{opcoes([["PF", "Pessoa física"], ["PJ", "Pessoa jurídica"]])}</select>
              </Campo>
              <Campo id="i_locador_documento" label="CPF / CNPJ do locador">
                <input {...bind("locador_documento")} />
              </Campo>
              <Campo id="i_locador_email" label="E-mail do locador">
                <input {...bind("locador_email")} type="email" />
              </Campo>
              <Campo id="i_locador_telefone" label="Telefone do locador">
                <input {...bind("locador_telefone")} type="tel" />
              </Campo>
              <Campo id="i_alojados" label="Alojados / uso">
                <input {...bind("alojados")} placeholder="Equipe ou pessoas" />
              </Campo>

              <div className="sec">Custos mensais além do aluguel</div>
              <div className="full enc-grid">
                {ENCARGOS.map(([k, l]) => (
                  <div className="field" key={k}>
                    <label htmlFor={`i_${k}_quem`}>{l}</label>
                    <div className="pair">
                      <select
                        id={`i_${k}_quem`}
                        value={f[`${k}_quem`]}
                        onChange={(e) => setF((o) => ({ ...o, [`${k}_quem`]: e.target.value, [`${k}_valor`]: e.target.value === "ultra" ? o[`${k}_valor`] : "" }))}
                      >
                        {opcoes(Object.entries(QUEM_LABEL))}
                      </select>
                      <input
                        {...bind(`${k}_valor`)}
                        type="number" min="0" step="0.01" inputMode="decimal" placeholder="R$/mês"
                        aria-label={`${l} valor mensal`} disabled={f[`${k}_quem`] !== "ultra"}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <Campo id="i_outros_inclusos" label="Outros itens inclusos no aluguel" className="full">
                <input {...bind("outros_inclusos")} placeholder="Ex.: limpeza semanal, roupa de cama, câmeras" />
              </Campo>

              <div className="sec">Pagamento e condições</div>
              <Campo id="i_dia_vencimento" label="Dia de vencimento">
                <input {...bind("dia_vencimento")} type="number" min="1" max="31" step="1" inputMode="numeric" />
              </Campo>
              <Campo id="i_situacao_pagamento" label="Situação do pagamento">
                <select {...bind("situacao_pagamento")}>{opcoes(PAGAMENTOS)}</select>
              </Campo>
              <Campo id="i_pendencias" label="Pendências" className="span2">
                <input {...bind("pendencias")} placeholder="Ex.: aluguel de 09/2026" />
              </Campo>
              <Campo id="i_indice_reajuste" label="Índice de reajuste">
                <select {...bind("indice_reajuste")}>{opcoes(INDICES)}</select>
              </Campo>
              <Campo id="i_garantia" label="Garantia">
                <select {...bind("garantia")}>{opcoes(GARANTIAS)}</select>
              </Campo>
              <Campo id="i_valor_garantia" label="Valor da garantia (R$)">
                <input {...bind("valor_garantia")} type="number" min="0" step="0.01" inputMode="decimal" />
              </Campo>
              <Campo id="i_aviso_previo_dias" label="Aviso prévio (dias)">
                <input {...bind("aviso_previo_dias")} type="number" min="0" step="1" inputMode="numeric" />
              </Campo>
              <Campo id="i_rescisao_sem_multa_apos_meses" label="Rescisão sem multa após (meses)">
                <input {...bind("rescisao_sem_multa_apos_meses")} type="number" min="0" step="1" inputMode="numeric" />
              </Campo>
              <Campo id="i_multa_atraso" label="Multa por atraso" className="span2">
                <input {...bind("multa_atraso")} placeholder="Ex.: 10% + juros de 1% a.m." />
              </Campo>
            </>
          )}

          <div className="sec">Planejamento e encerramento</div>
          <Campo id="i_previsao_saida" label="Previsão de saída (necessidade da obra)" obrig invalido={inv("previsao_saida")}>
            <input {...bind("previsao_saida")} type="date" />
          </Campo>
          <Campo id="i_aditivo_status" label="Aditivo">
            <select {...bind("aditivo_status")}>{opcoes([["", "Não solicitado"], ["solicitado", "Solicitado a Suprimentos"]])}</select>
          </Campo>
          <Campo id="i_aditivo_data" label="Data da solicitação">
            <input {...bind("aditivo_data")} type="date" />
          </Campo>
          <Campo id="i_data_devolucao" label="Data de devolução">
            <input {...bind("data_devolucao")} type="date" />
          </Campo>
          <Campo id="i_observacoes" label="Observações" className="full">
            <textarea {...bind("observacoes")} rows={2} />
          </Campo>
        </div>

        <div className="preview">
          {c ? (
            <>
              <span>
                Fim contratual ƒ: <b>{c.fim ? c.fim.split("-").reverse().join("/") : "—"}</b>
              </span>
              <span>
                Valor total FOC ƒ: <b>{brl(c.valorTotalFoc)}</b>
              </span>
              <span>
                Saldo hoje ƒ: <b className={c.saldo < 0 ? "neg" : ""} style={c.saldo < 0 ? { color: "var(--s-crit)" } : undefined}>{brl(c.saldo)}</b>
              </span>
              {ehImovel && (
                <span>
                  Custo mensal com encargos ƒ: <b>{brl(c.custoMensal)}</b>
                </span>
              )}
              <Chip st={c.status} />
              <span className="muted">
                {c.nota}
                {STATUS[c.status].a ? " · " + STATUS[c.status].a : ""}
              </span>
            </>
          ) : (
            <span className="muted">
              {ehImovel ? "Preencha início e término" : "Preencha chegada e prazo"} para ver o fim contratual, o saldo e o status.
            </span>
          )}
        </div>
        <div className="formacts">
          <button type="button" className="btn" onClick={onFechar}>
            Cancelar
          </button>
          <button type="submit" className="btn primary" disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar item"}
          </button>
        </div>
      </form>
      {item && <HistoricoItem id={item.id} />}
    </>
  );
}
