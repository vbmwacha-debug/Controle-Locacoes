// Geração e leitura de arquivos Excel com ExcelJS (carregado só quando precisa).
import type { Workbook, Worksheet } from "exceljs";
import type { Dados } from "./api";
import { CAT_IMOVEL, ENCARGOS } from "./calc";
import { hojeSP, parts } from "./datas";
import { UNIDADE_LABEL } from "./format";
import { COLS_IM, COLS_LOC, LISTAS_COLUNAS, LISTAS_FIXAS, type Celula, type Coluna } from "./planilha";
import { ACOES, QUEM_LABEL, type HistoricoLinha, type LocStatus } from "./tipos";

const exceljs = () => import("exceljs").then((m) => (m.default ?? m) as typeof import("exceljs"));

const LARANJA = "FFC55A11";
const LINHAS = 600;
const FMT: Record<string, string> = { text: "@", num: "#,##0.00", int: "0", date: "dd/mm/yyyy" };
const fmtCol = (t: string) => FMT[t] ?? "@";
const letra = (n: number) => {
  let s = "";
  for (; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};
/** "aaaa-mm-dd" → Date em UTC (o Excel grava como data, sem fuso). */
const dataXl = (iso: string | null | undefined) => {
  if (!iso) return null;
  const [y, m, d] = parts(iso);
  return new Date(Date.UTC(y, m - 1, d));
};

export async function baixar(wb: Workbook, nome: string) {
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function cabecalho(ws: Worksheet, titulos: string[]) {
  const r = ws.getRow(1);
  titulos.forEach((t, i) => (r.getCell(i + 1).value = t));
  r.height = 42;
  r.eachCell((c) => {
    c.font = { name: "Arial", bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LARANJA } };
    c.alignment = { vertical: "middle", wrapText: true };
  });
}

// ---------- modelo oficial (Instruções, Locações, Imóveis, Listas) ----------

interface Listas {
  dir: string[];
  cat: string[];
}

function listasDe(d: Dados): Listas {
  return {
    dir: d.diretorias.filter((x) => x.ativo).map((x) => x.nome),
    cat: [...d.categorias].sort((a, b) => a.id - b.id).filter((c) => c.nome !== CAT_IMOVEL).map((c) => c.nome),
  };
}

function abaInstrucoes(wb: Workbook) {
  const ws = wb.addWorksheet("Instruções");
  ws.getColumn(1).width = 4;
  ws.getColumn(2).width = 110;
  const corpo = { name: "Arial", size: 11, color: { argb: "FF1B2129" } };
  const al = { vertical: "top" as const, wrapText: true };
  const put = (r: number, v: string, font: object, fill?: string) => {
    const c = ws.getCell(`B${r}`);
    c.value = v;
    c.font = font;
    c.alignment = al;
    if (fill) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
  };
  put(2, "Modelo de importação — Controle de Locações Ultra", { name: "Arial", bold: true, size: 16, color: { argb: LARANJA } });
  put(3, "Preencha este arquivo no Excel e depois importe no sistema em Lançamentos da obra ou Imóveis > Importar planilha. Todas as linhas entram de uma vez.", corpo);
  put(5, "Como preencher", { name: "Arial", bold: true, size: 12, color: { argb: "FF1B2129" } });
  [
    "1. Aba Locações: equipamentos, veículos, containers e tudo que não é imóvel. Uma linha por item.",
    "2. Aba Imóveis: casas, apartamentos, alojamentos, bases e galpões, com IPTU, condomínio, água, energia, internet e condições do contrato.",
    "3. A linha 2 de cada aba (Código = EXEMPLO, em cinza) mostra o formato. O sistema ignora essa linha; pode apagar ou deixar.",
    "4. Colunas com * são obrigatórias. Colunas com lista suspensa só aceitam valores da aba Listas (Categoria aceita valor novo, que vira categoria nova).",
    "5. Datas no formato dd/mm/aaaa. Valores só com número (ex.: 1350,00), sem R$.",
    "6. Código: deixe vazio para item novo. Para atualizar um item que já está no sistema, use a exportação do sistema, que já vem com o código preenchido.",
    "7. Imóveis: em cada encargo, escolha quem paga. Só preencha o valor quando for 'Ultra paga'. Água e energia são pela média mensal.",
    "8. Na importação o sistema mostra uma prévia linha a linha, com os erros. Nada é gravado antes de você confirmar.",
  ].forEach((t, i) => put(6 + i, t, corpo));
  put(15, "Legenda", { name: "Arial", bold: true, size: 12, color: { argb: "FF1B2129" } });
  put(16, "Cabeçalho laranja: coluna do sistema.  * = obrigatório.  Célula amarela = informação a completar (nos arquivos já convertidos).", corpo, "FFFFF2A8");
}

function abaListas(wb: Workbook, l: Listas) {
  const ws = wb.addWorksheet("Listas");
  const valores: Record<string, string[]> = { ...LISTAS_FIXAS, dir: l.dir, cat: l.cat };
  cabecalho(ws, LISTAS_COLUNAS.map(([, t]) => t));
  ws.getRow(1).height = 15;
  const larg = [14, 48, 14, 16, 31, 21, 20, 14, 14, 15, 14];
  LISTAS_COLUNAS.forEach(([k], i) => {
    ws.getColumn(i + 1).width = larg[i];
    valores[k].forEach((v, j) => {
      const c = ws.getCell(j + 2, i + 1);
      c.value = v;
      c.font = { name: "Arial" };
    });
  });
  return Object.fromEntries(
    LISTAS_COLUNAS.map(([k], i) => [k, `Listas!$${letra(i + 1)}$2:$${letra(i + 1)}$${Math.max(2, valores[k].length + 1)}`]),
  ) as Record<string, string>;
}

const EXEMPLO_LOC: Record<string, unknown> = {
  codigo: "EXEMPLO", dir: "Victor", obra: "Residencial Exemplo", gestor: "Nome do gestor",
  cat: "Container (escritório, vestiário, sanitário, almoxarifado)", desc: "Container escritório 6,00x2,40m",
  forn: "LEMAQ LTDA", foc: "23393", ftc: "268-26", qtd: 1, val: 1100, unid: "Mês", prazo: 8,
  cheg: dataXl("2026-06-09"), prev: dataXl("2026-08-03"), adit: "Não solicitado",
};
const EXEMPLO_IM: Record<string, unknown> = {
  codigo: "EXEMPLO", dir: "Bruno", obra: "MOSAIC 21025", gestor: "Nome do gestor", desc: "Alojamento operacional — Araxá/MG",
  tipo: "Alojamento operacional", fase: "Ativo", forn: "Imobiliária Exemplo Ltda", doc: "PJ", cpfcnpj: "00.000.000/0001-00",
  email: "contato@exemplo.com.br", tel: "(34) 90000-0000", end: "Rua Exemplo, 100, apto 2", cidade: "Araxá/MG", capac: 6,
  alojados: "Equipe de montagem", ftc: "268-26", cotacao: "21824", val: 2500, cheg: dataXl("2026-06-01"),
  term: dataXl("2028-06-01"), prev: dataXl("2027-06-30"), iptu_q: "Incluso no aluguel", condominio_q: "Não se aplica",
  agua_q: "Ultra paga", agua_v: 120, energia_q: "Ultra paga", energia_v: 380, internet_q: "Ultra paga", internet_v: 99.9,
  inclusos: "Limpeza semanal", diavenc: 7, pag: "Em dia", reaj: "IGP-M", garantia: "Caução", garvalor: 5000, aviso: 30,
  rescisao: 12, multa: "10% + juros de 1% a.m.", adit: "Não solicitado",
};

function abaDados(wb: Workbook, nome: string, cols: Coluna[], linhas: Record<string, unknown>[], exemplo: Record<string, unknown> | null, faixas: Record<string, string>) {
  const ws = wb.addWorksheet(nome, { views: [{ state: "frozen", xSplit: 1, ySplit: 1, topLeftCell: "B2" }] });
  cols.forEach(([, , , t, w], i) => {
    const c = ws.getColumn(i + 1);
    c.width = w;
    c.numFmt = fmtCol(t);
    c.font = { name: "Arial" };
  });
  cabecalho(ws, cols.map(([, h, req]) => h + (req ? " *" : "")));
  let r = 2;
  if (exemplo) {
    const row = ws.getRow(r++);
    cols.forEach(([k, , , t], i) => {
      const c = row.getCell(i + 1);
      c.value = (exemplo[k] as never) ?? null;
      c.numFmt = fmtCol(t);
      c.font = { name: "Arial", italic: true, color: { argb: "FF808080" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } };
    });
  }
  for (const l of linhas) {
    const row = ws.getRow(r++);
    cols.forEach(([k, , , t], i) => {
      const c = row.getCell(i + 1);
      const v = l[k];
      c.value = v === "" || v == null ? null : (v as never);
      c.numFmt = fmtCol(t);
      c.font = { name: "Arial" };
    });
  }
  const fim = Math.max(LINHAS, r);
  ws.autoFilter = `A1:${letra(cols.length)}${fim}`;
  cols.forEach(([, , , t], i) => {
    if (!t.startsWith("list:")) return;
    const ln = t.slice(5);
    const col = letra(i + 1);
    const cat = ln === "cat";
    // dataValidations existe no ExcelJS 4.x, mas não está nos tipos publicados
    (ws as unknown as { dataValidations: { add: (r: string, v: object) => void } }).dataValidations.add(`${col}2:${col}${fim}`, {
      type: "list",
      allowBlank: true,
      formulae: [faixas[ln]],
      showErrorMessage: true,
      errorStyle: cat ? "warning" : "stop",
      errorTitle: cat ? "Categoria nova" : "Valor fora da lista",
      error: cat ? "Essa categoria não está na lista. Se continuar, ela será criada como nova no sistema." : "Escolha um valor da lista (aba Listas).",
    });
  });
  return ws;
}

/** Linha da aba Locações/Imóveis a partir do item do sistema (exportação "dados atuais"). */
function linhaDoItem(l: LocStatus, d: Dados): Record<string, unknown> {
  const m = d.imoveis.get(l.id);
  const o: Record<string, unknown> = {
    codigo: String(l.id), dir: l.diretoria_nome, obra: l.obra_nome, gestor: l.gestor_nome, cat: l.categoria_nome,
    desc: l.descricao, forn: l.fornecedor, foc: l.foc, ftc: l.ftc, qtd: l.quantidade, val: l.valor_unitario,
    unid: { mes: "Mês", semana: "Semana", dia: "Dia" }[l.unidade], prazo: l.prazo, cheg: dataXl(l.data_chegada),
    prev: dataXl(l.previsao_saida), adit: l.aditivo_status === "solicitado" ? "Solicitado" : "Não solicitado",
    aditdt: dataXl(l.aditivo_data), dev: dataXl(l.data_devolucao), obs: l.observacoes,
  };
  if (m) {
    Object.assign(o, {
      tipo: m.tipo_uso, fase: m.fase, doc: m.locador_tipo, cpfcnpj: m.locador_documento, email: m.locador_email,
      tel: m.locador_telefone, end: m.endereco, cidade: m.cidade_uf, capac: m.capacidade, alojados: m.alojados,
      cotacao: m.numero_cotacao, term: dataXl(m.termino_contrato), inclusos: m.outros_inclusos, diavenc: m.dia_vencimento,
      pag: m.situacao_pagamento, pend: m.pendencias, reaj: m.indice_reajuste, garantia: m.garantia, garvalor: m.valor_garantia,
      aviso: m.aviso_previo_dias, rescisao: m.rescisao_sem_multa_apos_meses, multa: m.multa_atraso,
    });
    const r = m as unknown as Record<string, unknown>;
    for (const [k] of ENCARGOS) {
      o[`${k}_q`] = QUEM_LABEL[(r[`${k}_quem`] as keyof typeof QUEM_LABEL) || "na"];
      o[`${k}_v`] = r[`${k}_quem`] === "ultra" ? Number(r[`${k}_valor`]) || 0 : null;
    }
  }
  return o;
}

async function montarModelo(d: Dados, comDados: boolean) {
  const E = await exceljs();
  const wb = new E.Workbook();
  wb.creator = "Controle de Locações Ultra";
  abaInstrucoes(wb);
  // a aba Listas precisa existir para as validações; é criada por último na ordem visual
  const tmp = new E.Workbook();
  const faixas = abaListas(tmp, listasDe(d));
  const loc = comDados ? d.locacoes.filter((l) => !l.e_imovel).map((l) => linhaDoItem(l, d)) : [];
  const im = comDados ? d.locacoes.filter((l) => l.e_imovel).map((l) => linhaDoItem(l, d)) : [];
  abaDados(wb, "Locações", COLS_LOC, loc, comDados ? null : EXEMPLO_LOC, faixas);
  abaDados(wb, "Imóveis", COLS_IM, im, comDados ? null : EXEMPLO_IM, faixas);
  abaListas(wb, listasDe(d));
  return wb;
}

export async function baixarModelo(d: Dados) {
  await baixar(await montarModelo(d, false), "Modelo_Importacao_Locacoes_Ultra.xlsx");
}

/** Mesmo formato do modelo, com o Código de cada item. Inclui dados do locador (exportação de imóveis). */
export async function exportarDadosAtuais(d: Dados) {
  await baixar(await montarModelo(d, true), `Locacoes_Ultra_export_${hojeSP()}.xlsx`);
}

// ---------- Excel geral (painel e obra), com campos calculados e sem dados pessoais ----------

export async function exportarGeral(rows: LocStatus[], origem: string) {
  const E = await exceljs();
  const wb = new E.Workbook();
  const ws = wb.addWorksheet("Locações", { views: [{ state: "frozen", xSplit: 0, ySplit: 1 }] });
  const cols: [string, number, string, (r: LocStatus) => unknown][] = [
    ["Código", 9, "0", (r) => r.id],
    ["Diretoria", 12, "@", (r) => r.diretoria_nome],
    ["Obra / centro de custo", 24, "@", (r) => r.obra_nome],
    ["Gestor", 18, "@", (r) => r.gestor_nome],
    ["Categoria", 28, "@", (r) => r.categoria_nome],
    ["Descrição", 34, "@", (r) => r.descricao],
    ["Fornecedor / locador", 24, "@", (r) => r.fornecedor],
    ["FOC", 10, "@", (r) => r.foc],
    ["FTC", 10, "@", (r) => r.ftc],
    ["Quantidade", 10, "#,##0.00", (r) => r.quantidade],
    ["Valor unitário / aluguel (R$)", 14, "#,##0.00", (r) => r.valor_unitario],
    ["Unidade", 8, "@", (r) => UNIDADE_LABEL[r.e_imovel ? "mes" : r.unidade]],
    ["Prazo", 8, "#,##0.0", (r) => r.prazo_calculado],
    ["Valor total FOC (R$)", 15, "#,##0.00", (r) => r.valor_total_foc],
    ["Chegada / início", 12, "dd/mm/yyyy", (r) => dataXl(r.data_chegada)],
    ["Fim contratual", 12, "dd/mm/yyyy", (r) => dataXl(r.fim_contratual)],
    ["Previsão de saída", 12, "dd/mm/yyyy", (r) => dataXl(r.previsao_saida)],
    ["Períodos usados", 10, "#,##0.00", (r) => r.periodos_usados],
    ["Saldo (R$)", 14, "#,##0.00;[Red]-#,##0.00", (r) => r.saldo],
    ["Custo mensal (R$)", 14, "#,##0.00", (r) => r.custo_mensal],
    ["Status", 20, "@", (r) => r.status_label],
    ["Situação", 40, "@", (r) => r.nota],
    ["Ação recomendada", 40, "@", (r) => r.acao],
    ["Fase (imóvel)", 14, "@", (r) => r.fase],
    ["Aditivo", 12, "@", (r) => (r.aditivo_status === "solicitado" ? "Solicitado" : "Não solicitado")],
    ["Data do aditivo", 12, "dd/mm/yyyy", (r) => dataXl(r.aditivo_data)],
    ["Devolução", 12, "dd/mm/yyyy", (r) => dataXl(r.data_devolucao)],
    ["Observações", 40, "@", (r) => r.observacoes],
  ];
  cols.forEach(([, w, f], i) => {
    ws.getColumn(i + 1).width = w;
    ws.getColumn(i + 1).numFmt = f;
  });
  cabecalho(ws, cols.map((c) => c[0]));
  [...rows]
    .sort((a, b) => a.status_ordem - b.status_ordem || (a.dias_fim ?? 0) - (b.dias_fim ?? 0))
    .forEach((r, i) => cols.forEach(([, , , fn], j) => (ws.getCell(i + 2, j + 1).value = (fn(r) ?? null) as never)));
  ws.autoFilter = `A1:${letra(cols.length)}${rows.length + 1}`;
  await baixar(wb, `Locacoes_${origem.replace(/[^\w]+/g, "_")}_${hojeSP()}.xlsx`);
}

export async function exportarHistorico(linhas: HistoricoLinha[]) {
  const E = await exceljs();
  const wb = new E.Workbook();
  const ws = wb.addWorksheet("Histórico", { views: [{ state: "frozen", ySplit: 1 }] });
  const cols: [string, number, string][] = [
    ["Data e hora", 18, "dd/mm/yyyy hh:mm"], ["Usuário", 24, "@"], ["Ação", 20, "@"], ["Código", 9, "0"],
    ["Item", 36, "@"], ["Obra", 26, "@"], ["O que mudou", 90, "@"],
  ];
  cols.forEach(([, w, f], i) => {
    ws.getColumn(i + 1).width = w;
    ws.getColumn(i + 1).numFmt = f;
  });
  cabecalho(ws, cols.map((c) => c[0]));
  linhas.forEach((h, i) => {
    // data/hora de São Paulo gravada como "hora local" no Excel
    const sp = new Date(new Date(h.em).toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const local = new Date(Date.UTC(sp.getFullYear(), sp.getMonth(), sp.getDate(), sp.getHours(), sp.getMinutes(), sp.getSeconds()));
    const r = ws.getRow(i + 2);
    r.values = [local, h.usuario, ACOES[h.acao]?.l ?? h.acao, h.locacao_id, h.item_descricao || h.referencia, h.obra_nome, h.resumo];
    r.getCell(7).alignment = { wrapText: true, vertical: "top" };
  });
  ws.autoFilter = `A1:G${linhas.length + 1}`;
  await baixar(wb, `Historico_Locacoes_${hojeSP()}.xlsx`);
}

// ---------- leitura ----------

function valorCelula(v: unknown): Celula {
  if (v == null) return "";
  if (v instanceof Date || typeof v !== "object") return v as Celula;
  const o = v as { result?: unknown; richText?: { text: string }[]; text?: string; error?: string };
  if ("result" in o) return valorCelula(o.result);
  if (o.richText) return o.richText.map((t) => t.text).join("");
  if (o.text != null) return String(o.text);
  return "";
}

/** Lê todas as abas do arquivo como matrizes de valores simples. */
export async function lerArquivo(buf: ArrayBuffer): Promise<{ nome: string; matriz: Celula[][] }[]> {
  const E = await exceljs();
  const wb = new E.Workbook();
  await wb.xlsx.load(buf);
  return wb.worksheets.map((ws) => {
    const m: Celula[][] = [];
    ws.eachRow({ includeEmpty: true }, (row, n) => {
      const vals = (row.values as unknown[]).slice(1).map(valorCelula);
      m[n - 1] = vals;
    });
    for (let i = 0; i < m.length; i++) if (!m[i]) m[i] = [];
    return { nome: ws.name, matriz: m };
  });
}

export { montarModelo as _montarModeloParaTeste };
