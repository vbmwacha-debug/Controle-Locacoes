// Formato oficial da planilha (Modelo_Importacao_Locacoes_Ultra.xlsx) e validação da importação.
// Não depende do ExcelJS: recebe as linhas já lidas (matriz de valores).
import { CAT_IMOVEL, ENCARGOS } from "./calc";
import { mesesEntre, toISO } from "./datas";
import { normalizar } from "./format";
import { FASES, GARANTIAS, INDICES, PAGAMENTOS, TIPOS_USO } from "./tipos";

export type TipoCol = "text" | "num" | "int" | "date" | `list:${string}`;
/** [chave, cabeçalho, obrigatório, tipo, largura] */
export type Coluna = [string, string, boolean, TipoCol, number];

export const COLS_LOC: Coluna[] = [
  ["codigo", "Código (vazio = item novo)", false, "text", 14],
  ["dir", "Diretoria", true, "list:dir", 14],
  ["obra", "Obra / centro de custo", true, "text", 24],
  ["gestor", "Gestor responsável", true, "text", 20],
  ["cat", "Categoria", true, "list:cat", 30],
  ["desc", "Descrição", true, "text", 34],
  ["forn", "Fornecedor", true, "text", 24],
  ["foc", "FOC", false, "text", 10],
  ["ftc", "FTC", false, "text", 10],
  ["qtd", "Quantidade", true, "num", 11],
  ["val", "Valor unitário (R$)", true, "num", 15],
  ["unid", "Unidade", true, "list:unid", 9],
  ["prazo", "Prazo contratado", true, "num", 10],
  ["cheg", "Data de chegada", true, "date", 13],
  ["prev", "Previsão de saída", false, "date", 13],
  ["adit", "Aditivo", false, "list:adit", 15],
  ["aditdt", "Data da solicitação do aditivo", false, "date", 14],
  ["dev", "Data de devolução", false, "date", 13],
  ["obs", "Observações", false, "text", 40],
];

export const COLS_IM: Coluna[] = [
  ["codigo", "Código (vazio = item novo)", false, "text", 14],
  ["dir", "Diretoria", true, "list:dir", 14],
  ["obra", "Obra / centro de custo", true, "text", 22],
  ["gestor", "Gestor responsável", true, "text", 20],
  ["desc", "Descrição", true, "text", 34],
  ["tipo", "Tipo de uso", true, "list:tipo", 24],
  ["fase", "Fase do contrato", true, "list:fase", 15],
  ["forn", "Locador", true, "text", 28],
  ["doc", "Locador PF ou PJ", false, "list:pfpj", 9],
  ["cpfcnpj", "CPF / CNPJ do locador", false, "text", 20],
  ["email", "E-mail do locador", false, "text", 24],
  ["tel", "Telefone do locador", false, "text", 16],
  ["end", "Endereço", false, "text", 40],
  ["cidade", "Cidade/UF", false, "text", 16],
  ["capac", "Capacidade (pessoas)", false, "int", 11],
  ["alojados", "Alojados / uso", false, "text", 28],
  ["foc", "FOC", false, "text", 10],
  ["ftc", "FTC", false, "text", 12],
  ["cotacao", "Nº cotação / MC", false, "text", 14],
  ["val", "Aluguel mensal (R$)", true, "num", 14],
  ["cheg", "Início da locação", true, "date", 13],
  ["term", "Término do contrato", true, "date", 13],
  ["prev", "Previsão de saída", false, "date", 13],
  ["iptu_q", "IPTU - quem paga", false, "list:quem", 17],
  ["iptu_v", "IPTU (R$/mês)", false, "num", 12],
  ["condominio_q", "Condomínio - quem paga", false, "list:quem", 17],
  ["condominio_v", "Condomínio (R$/mês)", false, "num", 12],
  ["agua_q", "Água - quem paga", false, "list:quem", 17],
  ["agua_v", "Água - média (R$/mês)", false, "num", 12],
  ["energia_q", "Energia - quem paga", false, "list:quem", 17],
  ["energia_v", "Energia - média (R$/mês)", false, "num", 12],
  ["internet_q", "Internet - quem paga", false, "list:quem", 17],
  ["internet_v", "Internet (R$/mês)", false, "num", 12],
  ["inclusos", "Outros inclusos no aluguel", false, "text", 26],
  ["diavenc", "Dia de vencimento", false, "int", 10],
  ["pag", "Situação do pagamento", false, "list:pag", 13],
  ["pend", "Pendências", false, "text", 28],
  ["reaj", "Índice de reajuste", false, "list:reaj", 12],
  ["garantia", "Garantia", false, "list:gar", 14],
  ["garvalor", "Valor da garantia (R$)", false, "num", 13],
  ["aviso", "Aviso prévio (dias)", false, "int", 10],
  ["rescisao", "Rescisão sem multa após (meses)", false, "int", 12],
  ["multa", "Multa por atraso", false, "text", 22],
  ["adit", "Aditivo", false, "list:adit", 15],
  ["aditdt", "Data da solicitação do aditivo", false, "date", 14],
  ["dev", "Data de devolução", false, "date", 13],
  ["obs", "Observações", false, "text", 50],
];

/** Listas fixas (aba Listas). Diretorias e categorias vêm do banco. */
export const LISTAS_FIXAS: Record<string, string[]> = {
  unid: ["Mês", "Semana", "Dia"],
  adit: ["Não solicitado", "Solicitado"],
  tipo: TIPOS_USO,
  fase: FASES,
  quem: ["Ultra paga", "Incluso no aluguel", "Locador paga", "Não se aplica"],
  pag: PAGAMENTOS,
  reaj: INDICES,
  gar: GARANTIAS,
  pfpj: ["PF", "PJ"],
};
/** Ordem e títulos das colunas da aba Listas. */
export const LISTAS_COLUNAS: [string, string][] = [
  ["dir", "Diretorias"], ["cat", "Categorias"], ["unid", "Unidades"], ["adit", "Aditivo"], ["tipo", "Tipos de uso"],
  ["fase", "Fases"], ["quem", "Quem paga"], ["pag", "Pagamento"], ["reaj", "Reajuste"], ["gar", "Garantia"], ["pfpj", "PF/PJ"],
];

const QUEM_COD: Record<string, string> = { "Ultra paga": "ultra", "Incluso no aluguel": "incluso", "Locador paga": "locador", "Não se aplica": "na" };
const UNID_COD: Record<string, string> = { Mês: "mes", Semana: "semana", Dia: "dia" };

// ---------- conversão de valores ----------

export type Celula = string | number | boolean | Date | null | undefined;

/** Data do Excel (Date ou número de série), dd/mm/aaaa ou aaaa-mm-dd → "aaaa-mm-dd". "" se vazio, null se inválida. */
export function lerData(v: Celula): string | null {
  if (v === "" || v == null) return "";
  if (v instanceof Date) return isNaN(v.getTime()) ? null : toISO(v.getUTCFullYear(), v.getUTCMonth() + 1, v.getUTCDate());
  if (typeof v === "number") {
    const d = new Date(Math.round((v - 25569) * 864e5));
    return toISO(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }
  const t = String(v).trim();
  let m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (m) {
    const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    return valida(y, Number(m[2]), Number(m[1]));
  }
  m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return valida(Number(m[1]), Number(m[2]), Number(m[3]));
  return null;
}
function valida(y: number, m: number, d: number) {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d ? toISO(y, m, d) : null;
}

/** Número com vírgula decimal e ponto de milhar ("1.350,00", "R$ 4,20"). "" se vazio, null se inválido. */
export function lerNumero(v: Celula): number | "" | null {
  if (v === "" || v == null) return "";
  if (typeof v === "number") return v;
  let t = String(v).replace(/R\$|\s/g, "");
  if (!t) return "";
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, "");
  const n = Number(t);
  return isNaN(n) ? null : n;
}

const escolher = (lista: string[], v: Celula) => lista.find((x) => normalizar(x) === normalizar(v));

// ---------- leitura e validação ----------

export interface Contexto {
  diretorias: string[];
  categorias: string[];
  /** Código → é imóvel? (itens que existem no sistema) */
  codigos: Map<number, boolean>;
  obras: string[];
}

export interface LinhaImport {
  aba: "Locações" | "Imóveis";
  linha: number;
  descricao: string;
  obra: string;
  codigo: number | null;
  erros: string[];
  avisos: string[];
  /** Formato aceito por loc_importar. */
  envio: Record<string, unknown>;
}

/** Acha a linha de cabeçalho pela coluna Descrição e casa as colunas pelo nome. */
export function lerAba(matriz: Celula[][], tipo: "loc" | "im", ctx: Contexto): { linhas: LinhaImport[]; erro?: string } {
  const cols = tipo === "im" ? COLS_IM : COLS_LOC;
  const hr = matriz.findIndex((r) => (r || []).some((c) => normalizar(c) === "descricao"));
  if (hr < 0) return { linhas: [], erro: "Cabeçalho não encontrado (coluna Descrição)." };
  const idx: Record<string, number> = {};
  (matriz[hr] || []).forEach((h, i) => {
    const c = cols.find((c) => normalizar(c[1]) === normalizar(h));
    if (c && idx[c[0]] == null) idx[c[0]] = i;
  });
  const faltam = cols.filter((c) => c[2] && idx[c[0]] == null).map((c) => c[1]);
  if (faltam.length) return { linhas: [], erro: "Faltam colunas obrigatórias: " + faltam.join(", ") + "." };

  const out: LinhaImport[] = [];
  for (let r = hr + 1; r < matriz.length; r++) {
    const row = matriz[r] || [];
    if (!row.some((c) => String(c ?? "").trim() !== "")) continue;
    const g = (k: string) => (idx[k] != null ? row[idx[k]] : "");
    if (normalizar(g("codigo")) === "exemplo") continue;
    const v: Record<string, unknown> = {};
    const erros: string[] = [];
    const avisos: string[] = [];
    for (const [k, h, req, t] of cols) {
      let x: unknown = g(k);
      if (t === "date") {
        const d = lerData(x as Celula);
        if (d === null) { erros.push(`${h}: data inválida`); x = ""; } else x = d;
      } else if (t === "num" || t === "int") {
        const n = lerNumero(x as Celula);
        if (n === null) { erros.push(`${h}: número inválido`); x = ""; } else x = t === "int" && n !== "" ? Math.round(n) : n;
      } else if (t.startsWith("list:")) {
        const ln = t.slice(5);
        const s = String(x ?? "").trim();
        if (s) {
          if (ln === "cat") {
            const ex = escolher(ctx.categorias, s);
            x = ex || s;
            if (!ex) avisos.push(`Categoria nova: "${s}"`);
            if (ex === CAT_IMOVEL) erros.push("Imóveis vão na aba Imóveis");
          } else {
            const lista = ln === "dir" ? ctx.diretorias : LISTAS_FIXAS[ln];
            const ok = escolher(lista, s);
            if (!ok) { erros.push(`${h}: "${s}" fora da lista`); x = ""; } else x = ok;
          }
        } else x = "";
      } else x = String(x ?? "").trim();
      if (req && (x === "" || x == null)) erros.push(`${h} obrigatório`);
      v[k] = x;
    }

    // código
    let codigo: number | null = null;
    const cod = String(v.codigo || "").trim();
    if (cod) {
      codigo = Number(cod);
      if (!Number.isInteger(codigo) || !ctx.codigos.has(codigo)) erros.push(`Código ${cod} não existe no sistema`);
      else if (ctx.codigos.get(codigo) !== (tipo === "im")) erros.push(`Código ${cod} é de ${tipo === "im" ? "uma locação" : "um imóvel"}; use a aba ${tipo === "im" ? "Locações" : "Imóveis"}`);
    }
    if (v.obra && !ctx.obras.some((o) => normalizar(o) === normalizar(v.obra))) avisos.push("Obra nova (será cadastrada)");

    const dados: Record<string, unknown> = {
      id: codigo,
      descricao: v.desc,
      fornecedor: v.forn,
      foc: v.foc || null,
      ftc: v.ftc || null,
      valor_unitario: v.val === "" ? null : v.val,
      data_chegada: v.cheg || null,
      previsao_saida: v.prev || null,
      aditivo_status: v.adit === "Solicitado" ? "solicitado" : "",
      aditivo_data: v.aditdt || null,
      data_devolucao: v.dev || null,
      observacoes: v.obs || null,
    };
    if (tipo === "im") {
      if (v.cheg && v.term && String(v.term) <= String(v.cheg)) erros.push("Término antes do início");
      const imovel: Record<string, unknown> = {
        termino_contrato: v.term || null,
        fase: v.fase || null,
        numero_cotacao: v.cotacao || null,
        tipo_uso: v.tipo || null,
        endereco: v.end || null,
        cidade_uf: v.cidade || null,
        capacidade: v.capac === "" ? null : v.capac,
        alojados: v.alojados || null,
        locador_tipo: v.doc || null,
        locador_documento: v.cpfcnpj || null,
        locador_email: v.email || null,
        locador_telefone: v.tel || null,
        outros_inclusos: v.inclusos || null,
        dia_vencimento: v.diavenc === "" ? null : v.diavenc,
        situacao_pagamento: v.pag || null,
        pendencias: v.pend || null,
        indice_reajuste: v.reaj || null,
        garantia: v.garantia || null,
        valor_garantia: v.garvalor === "" ? null : v.garvalor,
        aviso_previo_dias: v.aviso === "" ? null : v.aviso,
        rescisao_sem_multa_apos_meses: v.rescisao === "" ? null : v.rescisao,
        multa_atraso: v.multa || null,
      };
      if (imovel.dia_vencimento != null && (Number(imovel.dia_vencimento) < 1 || Number(imovel.dia_vencimento) > 31))
        erros.push("Dia de vencimento deve ser de 1 a 31");
      for (const [k] of ENCARGOS) {
        const valor = v[`${k}_v`] === "" ? null : Number(v[`${k}_v`]);
        // valor sem "quem paga" = Ultra paga; sem os dois = Não se aplica
        const q = QUEM_COD[String(v[`${k}_q`])] || (valor ? "ultra" : "na");
        imovel[`${k}_quem`] = q;
        imovel[`${k}_valor`] = q === "ultra" ? valor : null;
      }
      dados.imovel = imovel;
      dados.quantidade = 1;
      dados.unidade = "mes";
      dados.prazo = v.cheg && v.term ? mesesEntre(String(v.cheg), String(v.term)) : null;
    } else {
      if (v.prazo !== "" && Number(v.prazo) <= 0) erros.push("Prazo deve ser maior que zero");
      if (v.qtd !== "" && Number(v.qtd) <= 0) erros.push("Quantidade deve ser maior que zero");
      dados.quantidade = v.qtd === "" ? null : v.qtd;
      dados.unidade = UNID_COD[String(v.unid)] || "mes";
      dados.prazo = v.prazo === "" ? null : v.prazo;
    }
    if (v.cheg && v.dev && String(v.dev) < String(v.cheg)) erros.push("Devolução antes da chegada");

    out.push({
      aba: tipo === "im" ? "Imóveis" : "Locações",
      linha: r + 1,
      descricao: String(v.desc || ""),
      obra: String(v.obra || ""),
      codigo,
      erros,
      avisos,
      envio: {
        aba: tipo === "im" ? "Imóveis" : "Locações",
        linha: r + 1,
        obra_nome: v.obra,
        diretoria_nome: v.dir,
        gestor_nome: v.gestor,
        categoria_nome: tipo === "im" ? CAT_IMOVEL : v.cat,
        dados,
      },
    });
  }
  return { linhas: out };
}

// ---------- planilha antiga "CONTROLE GERAL DE LOCAÇÕES IMÓVEIS" ----------

const FASE_ANTIGA: [RegExp, string][] = [
  [/desmobilizad/, "Desmobilizado"],
  [/desmobiliz/, "Desmobilizar"],
  [/mobiliz/, "Mobilizar"],
  [/tramit/, "Tramitando"],
  [/pendent|distrat/, "Pendente / distrato"],
  [/encerrad|finalizad/, "Encerrado"],
  [/ativ|vigente/, "Ativo"],
];

/** Detecta a planilha antiga de imóveis (tem LOCADOR e CENTRO DE CUSTO e não tem Descrição). */
export function ehPlanilhaAntiga(matriz: Celula[][]) {
  return matriz.slice(0, 15).some((r) => {
    const n = (r || []).map(normalizar);
    return n.includes("locador") && n.includes("centro de custo") && !n.includes("descricao");
  });
}

/** Converte a planilha antiga de imóveis para o formato da aba Imóveis e valida igual. */
export function converterPlanilhaAntiga(matriz: Celula[][], ctx: Contexto): { linhas: LinhaImport[]; erro?: string } {
  const hr = matriz.findIndex((r) => (r || []).some((c) => normalizar(c) === "locador"));
  const cab = (matriz[hr] || []).map(normalizar);
  const col = (...nomes: string[]) => cab.findIndex((h) => nomes.some((n) => h === normalizar(n)));
  const c = {
    ftc: col("N°FTC", "Nº FTC", "N FTC", "FTC"),
    cot: col("N° COTAÇÃO", "Nº COTAÇÃO", "COTAÇÃO"),
    status: col("STATUS"),
    locador: col("LOCADOR"),
    cc: col("CENTRO DE CUSTO"),
    resp: col("RESPONSAVEL", "RESPONSÁVEL"),
    doc: col("CNPJ/CPF", "CPF/CNPJ"),
    email: col("EMAIL", "E-MAIL"),
    tel: col("CONTATO", "TELEFONE"),
    tipo: col("TIPO DE IMOVEL", "TIPO DE IMÓVEL"),
    pfpj: col("PF/PJ"),
    end: col("LOGRADOURO", "ENDEREÇO"),
    aloj: col("ALOJADOS"),
    reaj: col("CRITÉRIOS DE REAJUSTE", "CRITERIOS DE REAJUSTE"),
    obs: col("OBSERVAÇÕES", "OBSERVACOES"),
    ini: col("INÍCIO", "INICIO"),
    fim: col("TÉRMINO", "TERMINO"),
    alug: col("ALUGUEL"),
    iptu: col("IPTU"),
    net: col("INTERNET"),
    ene: col("MÉDIO ENERGIA", "MEDIO ENERGIA", "ENERGIA"),
    agua: col("MÉDIO ÁGUA", "MEDIO AGUA", "ÁGUA"),
    cond: col("CONDOMÍNIO", "CONDOMINIO"),
    venc: col("VENCIMENTO"),
    pend: col("ALUGUEL PENDENTE"),
    sit: col("SITUAÇÃO", "SITUACAO"),
  };
  const nova: Celula[][] = [COLS_IM.map((x) => x[1])];
  const linhasOrig: number[] = [];
  for (let r = hr + 1; r < matriz.length; r++) {
    const row = matriz[r] || [];
    if (!row.some((x) => String(x ?? "").trim() !== "")) continue;
    const g = (i: number): Celula => (i >= 0 ? row[i] : "");
    const st = normalizar(g(c.status));
    const fase = FASE_ANTIGA.find(([re]) => re.test(st))?.[1] ?? (st ? String(g(c.status)) : "");
    const tipoTxt = String(g(c.tipo) ?? "").trim();
    const tipo = escolher(TIPOS_USO, tipoTxt) || TIPOS_USO.find((t) => normalizar(tipoTxt) && normalizar(t).includes(normalizar(tipoTxt))) || (tipoTxt ? "Outro" : "");
    const reajTxt = normalizar(g(c.reaj));
    const reaj = reajTxt.includes("igp") ? "IGP-M" : reajTxt.includes("ipca") ? "IPCA" : reajTxt.includes("incc") ? "INCC" : reajTxt ? "Sem reajuste" : "";
    const venc = g(c.venc);
    const dia = venc instanceof Date ? venc.getUTCDate() : lerNumero(venc);
    const sit = normalizar(g(c.sit));
    const aloj = g(c.aloj);
    const end = String(g(c.end) ?? "").trim();
    const desc = [tipo || "Imóvel", end].filter(Boolean).join(" — ");
    const val: Record<string, Celula> = {
      codigo: "", dir: "", obra: g(c.cc), gestor: g(c.resp), desc, tipo, fase, forn: g(c.locador),
      doc: g(c.pfpj), cpfcnpj: g(c.doc), email: g(c.email), tel: g(c.tel), end, cidade: "",
      capac: typeof aloj === "number" ? aloj : "", alojados: typeof aloj === "number" ? "" : aloj,
      foc: "", ftc: g(c.ftc), cotacao: g(c.cot), val: g(c.alug), cheg: g(c.ini), term: g(c.fim), prev: "",
      iptu_v: g(c.iptu), condominio_v: g(c.cond), agua_v: g(c.agua), energia_v: g(c.ene), internet_v: g(c.net),
      diavenc: typeof dia === "number" ? dia : "", pag: sit.includes("atras") ? "Em atraso" : sit ? "Em dia" : "",
      pend: g(c.pend), reaj, obs: g(c.obs),
    };
    nova.push(COLS_IM.map(([k]) => val[k] ?? ""));
    linhasOrig.push(r + 1);
  }
  // diretoria vem da obra já cadastrada; se a obra é nova, a linha fica incompleta
  const res = lerAba(nova, "im", ctx);
  res.linhas.forEach((l, i) => {
    l.linha = linhasOrig[i];
    (l.envio as { linha: number }).linha = linhasOrig[i];
    const obraExiste = ctx.obras.some((o) => normalizar(o) === normalizar(l.obra));
    l.erros = l.erros.filter((e) => !(e.startsWith("Diretoria") && obraExiste));
    if (!obraExiste) l.erros = l.erros.map((e) => (e === "Diretoria obrigatório" ? "Diretoria obrigatória (obra nova): complete na planilha" : e));
  });
  return res;
}
