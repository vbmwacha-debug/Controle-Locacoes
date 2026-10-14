// Cálculos e status das locações. Mesma lógica do calc() do protótipo e da view loc_locacoes_status.
// Se mudar algo aqui, mude também no supabase/schema.sql (view loc_locacoes_status).
import { addDias, addMeses, diasEntre, fmtData, mesesEntre, parts, toISO, type ISO } from "./datas";

/** Antecedência (dias) para acionar Suprimentos antes do fim contratual. */
export const ANTECEDENCIA = 30;
/** Janela padrão de "Programar devolução" (dias até a previsão de saída). */
export const JANELA_DEVOLUCAO = 15;
/** Janela de "Vence em até 60 dias". */
export const JANELA_ATENCAO = 60;

export const CAT_IMOVEL = "Imóvel (alojamento, casa, base, galpão)";

export type Unidade = "mes" | "semana" | "dia";
export type Quem = "ultra" | "incluso" | "locador" | "na";
export type Fase =
  | "Mobilizar"
  | "Tramitando"
  | "Ativo"
  | "Desmobilizar"
  | "Pendente / distrato"
  | "Desmobilizado"
  | "Encerrado";

export const ENCARGOS = [
  ["iptu", "IPTU"],
  ["condominio", "Condomínio"],
  ["agua", "Água (média)"],
  ["energia", "Energia (média)"],
  ["internet", "Internet"],
] as const;
export type Encargo = (typeof ENCARGOS)[number][0];

export const DIAS_PERIODO: Record<Unidade, number> = { dia: 1, semana: 7, mes: 30.4375 };
export const PARA_MES: Record<Unidade, number> = { dia: 30.4375, semana: 4.345, mes: 1 };

export type StatusKey =
  | "vencido"
  | "aditar"
  | "atrasada"
  | "aditamento"
  | "contratacao"
  | "programar"
  | "atencao"
  | "prever"
  | "ok"
  | "encerrado";

/** l = rótulo, o = gravidade (menor = mais grave), a = ação recomendada. */
export const STATUS: Record<StatusKey, { l: string; o: number; a: string }> = {
  vencido: { l: "Vencido sem cobertura", o: 0, a: "Aditar ou devolver hoje. Pagamento vai travar." },
  aditar: { l: "Aditar agora", o: 1, a: "Acionar Suprimentos: obra precisa além do contrato." },
  atrasada: { l: "Saída atrasada", o: 2, a: "Devolver ou atualizar a previsão de saída." },
  aditamento: { l: "Em aditamento", o: 3, a: "Acompanhar aditivo com Suprimentos." },
  contratacao: { l: "Em contratação", o: 3, a: "Concluir contrato e FOC antes de ocupar." },
  programar: { l: "Programar devolução", o: 4, a: "Agendar retirada com o fornecedor." },
  atencao: { l: "Vence em até 60 dias", o: 5, a: "Confirmar se devolve ou adita." },
  prever: { l: "Prever aditivo", o: 5, a: "Previsão de saída passa do contrato." },
  ok: { l: "Prazo OK", o: 6, a: "" },
  encerrado: { l: "Encerrado", o: 7, a: "" },
};

/** Ordem do gráfico empilhado e da legenda. */
export const ORDEM_STATUS: StatusKey[] = [
  "vencido",
  "contratacao",
  "aditar",
  "atrasada",
  "aditamento",
  "programar",
  "atencao",
  "prever",
  "ok",
];

export interface EncargoValor {
  quem: Quem;
  valor: number | null;
}

export interface CalcImovel {
  termino_contrato: ISO | null;
  fase: Fase | string;
  aviso_previo_dias: number | null;
  indice_reajuste: string | null;
  encargos: Partial<Record<Encargo, EncargoValor>>;
}

export interface CalcInput {
  quantidade: number;
  valor_unitario: number;
  unidade: Unidade;
  prazo: number;
  data_chegada: ISO | null;
  previsao_saida: ISO | null;
  aditivo_status: "" | "solicitado" | string | null;
  aditivo_data: ISO | null;
  data_devolucao: ISO | null;
  /** Preenchido só quando a categoria é Imóvel. */
  imovel?: CalcImovel | null;
}

export interface CalcResult {
  fim: ISO | null;
  prazo: number;
  periodosUsados: number;
  valorTotalFoc: number;
  saldo: number;
  /** quantidade × valor unitário convertido para mês (imóvel: só o aluguel). */
  mensalBase: number;
  encargosUltra: number;
  /** custo mensal total (imóvel: aluguel + encargos pagos pela Ultra). */
  custoMensal: number;
  diasFim: number | null;
  diasPrev: number | null;
  status: StatusKey;
  statusLabel: string;
  nota: string;
  acao: string;
  avisarLocadorAte: ISO | null;
  proximoReajuste: ISO | null;
  diasReajuste: number | null;
}

/** Soma um prazo na unidade (mês no calendário; fração de mês vira dias). */
export function addPeriodo(iso: ISO, n: number, u: Unidade): ISO {
  if (u === "dia") return addDias(iso, Math.round(n));
  if (u === "semana") return addDias(iso, Math.round(7 * n));
  const inteiro = Math.floor(n);
  const frac = n - inteiro;
  return addDias(addMeses(iso, inteiro), Math.round(frac * 30.4375));
}

/** Próximo aniversário da data de início, estritamente depois de hoje. */
export function proximoAniversario(inicio: ISO, hoje: ISO): ISO {
  const [, m, d] = parts(inicio);
  const [hy] = parts(hoje);
  const neste = toISO(hy, m, Math.min(d, diasNoMes(hy, m)));
  if (neste > hoje) return neste;
  return toISO(hy + 1, m, Math.min(d, diasNoMes(hy + 1, m)));
}
const diasNoMes = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

export function calc(it: CalcInput, hoje: ISO): CalcResult {
  const im = it.imovel ?? null;
  const cheg = it.data_chegada || null;
  const prev = it.previsao_saida || null;
  const dev = it.data_devolucao || null;
  const unidade: Unidade = im ? "mes" : it.unidade || "mes";
  const qtd = im ? 1 : Number(it.quantidade) || 0;
  const val = Number(it.valor_unitario) || 0;

  let fim: ISO | null;
  let prazo = Number(it.prazo) || 0;
  if (im) {
    fim = im.termino_contrato || null;
    prazo = cheg && fim ? mesesEntre(cheg, fim) : 0;
  } else {
    fim = cheg ? addPeriodo(cheg, prazo, unidade) : null;
  }

  const encargosUltra = im
    ? ENCARGOS.reduce((s, [k]) => {
        const e = im.encargos[k];
        return s + (e && e.quem === "ultra" ? Number(e.valor) || 0 : 0);
      }, 0)
    : 0;
  const aviso = im ? Number(im.aviso_previo_dias) || 0 : 0;
  const avisarLocadorAte = im && prev && aviso ? addDias(prev, -aviso) : null;
  const proximoReajuste =
    im && cheg && !dev && im.indice_reajuste && im.indice_reajuste !== "Sem reajuste"
      ? proximoAniversario(cheg, hoje)
      : null;
  const diasReajuste = proximoReajuste ? diasEntre(hoje, proximoReajuste) : null;

  const ref = dev || hoje;
  const diasUsados = cheg ? Math.max(0, diasEntre(cheg, ref)) : 0;
  const periodosUsados = diasUsados / DIAS_PERIODO[unidade];
  const porPeriodo = qtd * val;
  const valorTotalFoc = porPeriodo * prazo;
  const saldo = valorTotalFoc - porPeriodo * periodosUsados;
  const mensalBase = porPeriodo * PARA_MES[unidade];
  const custoMensal = mensalBase + encargosUltra;

  const diasFim = fim ? diasEntre(hoje, fim) : null;
  const diasPrev = prev ? diasEntre(hoje, prev) : null;
  const fase = im ? String(im.fase || "") : "";
  const janela = JANELA_DEVOLUCAO + aviso;
  const aditSolicitado = it.aditivo_status === "solicitado";

  let status: StatusKey = "ok";
  let nota = "";

  if (dev || fase === "Desmobilizado" || fase === "Encerrado") {
    status = "encerrado";
    nota = dev ? "Devolvido em " + fmtData(dev) : "Fase: " + fase;
  } else if (diasFim !== null && diasFim < 0) {
    status = "vencido";
    nota =
      "Venceu há " +
      -diasFim +
      (-diasFim === 1 ? " dia" : " dias") +
      (aditSolicitado
        ? " · aditivo solicitado" + (it.aditivo_data ? " em " + fmtData(it.aditivo_data) : "")
        : fase === "Tramitando"
          ? " · aditivo tramitando"
          : "");
  } else if (fase === "Mobilizar") {
    status = "contratacao";
    nota = "Ocupação prevista para " + fmtData(cheg);
  } else if (aditSolicitado || fase === "Tramitando") {
    status = "aditamento";
    nota =
      (it.aditivo_data ? "Solicitado em " + fmtData(it.aditivo_data) + " · " : "") +
      (diasFim !== null ? "contrato vence em " + diasFim + " dias" : "aditivo em andamento");
  } else if (diasFim !== null && fim && diasFim <= ANTECEDENCIA && (!prev || prev >= fim)) {
    status = "aditar";
    nota =
      "Contrato vence em " +
      diasFim +
      " dias" +
      (prev ? "; obra precisa até " + fmtData(prev) : "; sem previsão de saída");
  } else if (diasPrev !== null && diasPrev < 0) {
    status = "atrasada";
    nota = "Saída prevista para " + fmtData(prev) + " (" + -diasPrev + " dias atrás)";
  } else if (fase === "Desmobilizar") {
    status = "programar";
    nota =
      avisarLocadorAte && diasPrev !== null
        ? "Desmobilização em andamento · avisar o locador até " + fmtData(avisarLocadorAte)
        : "Desmobilização em andamento" + (diasPrev !== null ? " · saída em " + diasPrev + " dias" : "");
  } else if ((diasPrev !== null && diasPrev <= janela) || (diasFim !== null && diasFim <= ANTECEDENCIA)) {
    status = "programar";
    nota = avisarLocadorAte
      ? "Avisar o locador até " + fmtData(avisarLocadorAte) + " (aviso de " + aviso + " dias)"
      : "Saída em " + (diasPrev !== null ? diasPrev : diasFim) + " dias";
  } else if (diasFim !== null && diasFim <= JANELA_ATENCAO) {
    status = "atencao";
    nota = "Contrato vence em " + diasFim + " dias";
  } else if (prev && fim && prev > fim) {
    status = "prever";
    nota = "Pedir aditivo até " + fmtData(addDias(fim, -ANTECEDENCIA));
  } else {
    nota = diasFim !== null ? "Contrato vence em " + diasFim + " dias" : "Sem data de fim contratual";
  }

  return {
    fim,
    prazo,
    periodosUsados,
    valorTotalFoc,
    saldo,
    mensalBase,
    encargosUltra,
    custoMensal,
    diasFim,
    diasPrev,
    status,
    statusLabel: STATUS[status].l,
    nota,
    acao: STATUS[status].a,
    avisarLocadorAte,
    proximoReajuste,
    diasReajuste,
  };
}
