import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Dados } from "./api";
import { CAT_IMOVEL } from "./calc";
import { _montarModeloParaTeste, lerArquivo } from "./excel";
import { converterPlanilhaAntiga, ehPlanilhaAntiga, lerAba, lerData, lerNumero, type Contexto } from "./planilha";
import type { ImovelDetalhes, LocStatus } from "./tipos";

const CATS = [
  "Container (escritório, vestiário, sanitário, almoxarifado)", "Banheiro químico", "Andaime", "Escoramento e formas",
  "Plataforma elevatória e balancim", "Elevador de obra / cremalheira", "Grua e guindaste", "Máquina de terraplenagem",
  "Equipamento de compactação", "Caminhão (munck, basculante, pipa)", "Veículo leve (carro, pick-up, van)",
  "Transporte de pessoal (ônibus, micro-ônibus)", "Gerador e energia", "Torre de iluminação", "Compressor de ar",
  "Bomba (drenagem, concreto)", "Betoneira e equipamento de concreto", "Ferramentas elétricas e manuais",
  "Topografia (estação total, GPS)", "Proteção coletiva (guarda-corpo, telas)", "Tapume e cercamento", "Caçamba de entulho",
  "Mobiliário e ar-condicionado", "Informática e rádios", CAT_IMOVEL,
];
const DIRS = ["Victor", "Bruno", "Wellington", "Cesar", "Braulio", "Flavio", "Adriana", "Claudimar"];

const loc = (o: Partial<LocStatus>) => ({
  id: 1, obra_id: 1, obra_nome: "Residencial Teste", diretoria_id: 1, diretoria_nome: "Victor", gestor_nome: "Gestor Um",
  categoria_id: 3, categoria_nome: "Andaime", e_imovel: false, descricao: "Andaime fachadeiro", fornecedor: "Locadora X",
  foc: "23393", ftc: "268-26", quantidade: 850, valor_unitario: 4.2, unidade: "mes", prazo: 8, data_chegada: "2026-02-25",
  previsao_saida: "2026-12-20", aditivo_status: "", aditivo_data: null, data_devolucao: null, observacoes: null, ...o,
}) as LocStatus;

const dados: Dados = {
  diretorias: DIRS.map((nome, i) => ({ id: i + 1, nome, ativo: true })),
  obras: [{ id: 1, nome: "Residencial Teste", diretoria_id: 1, gestor_nome: "Gestor Um", ativa: true, criado_em: "" }],
  categorias: CATS.map((nome, i) => ({ id: i + 1, nome, sugerida: true, criado_por: null, criado_em: "" })),
  usuarios: [],
  locacoes: [
    loc({}),
    loc({ id: 2, e_imovel: true, categoria_nome: CAT_IMOVEL, descricao: "Alojamento", fornecedor: "Locador PF", valor_unitario: 3000, data_chegada: "2026-03-20" }),
  ],
  imoveis: new Map([[2, {
    locacao_id: 2, termino_contrato: "2027-03-20", fase: "Ativo", tipo_uso: "Alojamento operacional", locador_tipo: "PF",
    locador_documento: "000.000.000-00", iptu_quem: "ultra", iptu_valor: 200, condominio_quem: "incluso", condominio_valor: null,
    agua_quem: "na", agua_valor: null, energia_quem: "locador", energia_valor: null, internet_quem: "na", internet_valor: null,
    aviso_previo_dias: 30, indice_reajuste: "IGP-M",
  } as unknown as ImovelDetalhes]]),
};

const ctx: Contexto = { diretorias: DIRS, categorias: CATS, codigos: new Map([[1, false], [2, true]]), obras: ["Residencial Teste"] };

async function gerar(comDados: boolean) {
  const wb = await _montarModeloParaTeste(dados, comDados);
  const buf = await wb.xlsx.writeBuffer();
  return { wb, abas: await lerArquivo(buf as ArrayBuffer) };
}

describe("modelo igual ao oficial", () => {
  it("mesmas abas, cabeçalhos e listas do Modelo_Importacao_Locacoes_Ultra.xlsx", async () => {
    const oficialBuf = readFileSync(new URL("../../Modelo_Importacao_Locacoes_Ultra.xlsx", import.meta.url));
    const oficial = await lerArquivo(oficialBuf.buffer.slice(oficialBuf.byteOffset, oficialBuf.byteOffset + oficialBuf.byteLength) as ArrayBuffer);
    const { abas } = await gerar(false);
    expect(abas.map((a) => a.nome)).toEqual(oficial.map((a) => a.nome));
    for (const nome of ["Locações", "Imóveis", "Listas"]) {
      const a = abas.find((x) => x.nome === nome)!;
      const o = oficial.find((x) => x.nome === nome)!;
      expect(a.matriz[0]).toEqual(o.matriz[0]);
    }
    // conteúdo da aba Listas
    const L = abas.find((x) => x.nome === "Listas")!.matriz;
    const OL = oficial.find((x) => x.nome === "Listas")!.matriz;
    expect(L.slice(0, 26)).toEqual(OL.slice(0, 26));
    // linha de exemplo
    expect(abas.find((x) => x.nome === "Locações")!.matriz[1][0]).toBe("EXEMPLO");
    expect(abas.find((x) => x.nome === "Imóveis")!.matriz[1][0]).toBe("EXEMPLO");
    // instruções
    const ins = abas.find((x) => x.nome === "Instruções")!.matriz;
    const oins = oficial.find((x) => x.nome === "Instruções")!.matriz;
    expect(ins.slice(0, 16)).toEqual(oins.slice(0, 16));
  });

  it("listas suspensas apontam para a aba Listas", async () => {
    const { wb } = await gerar(false);
    const ws = wb.getWorksheet("Imóveis")! as unknown as { dataValidations: { model: Record<string, { formulae: string[]; errorStyle?: string }> } };
    const m = ws.dataValidations.model;
    expect(Object.values(m).some((v) => v.formulae[0] === "Listas!$G$2:$G$5")).toBe(true);
    const wl = wb.getWorksheet("Locações")! as unknown as typeof ws;
    const cat = Object.values(wl.dataValidations.model).find((v) => v.formulae[0].startsWith("Listas!$B$2"));
    expect(cat?.formulae[0]).toBe("Listas!$B$2:$B$25");
    expect(cat?.errorStyle).toBe("warning");
  });

  it("o modelo vazio não gera linhas (EXEMPLO é ignorado)", async () => {
    const { abas } = await gerar(false);
    expect(lerAba(abas.find((a) => a.nome === "Locações")!.matriz, "loc", ctx).linhas).toEqual([]);
    expect(lerAba(abas.find((a) => a.nome === "Imóveis")!.matriz, "im", ctx).linhas).toEqual([]);
  });

  it("exportar e importar de volta = atualiza os mesmos códigos sem erro", async () => {
    const { abas } = await gerar(true);
    const l = lerAba(abas.find((a) => a.nome === "Locações")!.matriz, "loc", ctx).linhas;
    const i = lerAba(abas.find((a) => a.nome === "Imóveis")!.matriz, "im", ctx).linhas;
    expect(l.map((x) => [x.codigo, x.erros])).toEqual([[1, []]]);
    expect(i.map((x) => [x.codigo, x.erros])).toEqual([[2, []]]);
    const d = (l[0].envio as { dados: Record<string, unknown> }).dados;
    expect(d).toMatchObject({ quantidade: 850, valor_unitario: 4.2, prazo: 8, data_chegada: "2026-02-25", previsao_saida: "2026-12-20", unidade: "mes" });
    const im = (i[0].envio as { dados: { imovel: Record<string, unknown> } }).dados.imovel;
    expect(im).toMatchObject({ termino_contrato: "2027-03-20", iptu_quem: "ultra", iptu_valor: 200, condominio_quem: "incluso", locador_documento: "000.000.000-00" });
  });
});

describe("validação da importação", () => {
  const cab = ["Código (vazio = item novo)", "Diretoria *", "Obra / centro de custo *", "Gestor responsável *", "Categoria *", "Descrição *",
    "Fornecedor *", "FOC", "FTC", "Quantidade *", "Valor unitário (R$) *", "Unidade *", "Prazo contratado *", "Data de chegada *",
    "Previsão de saída", "Aditivo", "Data da solicitação do aditivo", "Data de devolução", "Observações"];
  it("cabeçalho em qualquer linha, sem acento/asterisco, valores brasileiros e erros por linha", () => {
    const m = [
      ["Planilha da obra"],
      cab.map((h) => h.replace(" *", "").toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "")),
      ["", "victor", "Obra Nova", "G", "Gerador novo", "Gerador 150 kVA", "F", "1", "", "1", "1.350,50", "mês", "3", "09/06/2026", "2026-09-09"],
      ["", "Zé", "Residencial Teste", "G", "Andaime", "X", "F", "", "", "1", "abc", "Mês", "0", "31/02/2026"],
      ["99", "Victor", "Residencial Teste", "G", "Andaime", "Y", "F", "", "", "1", "10", "Mês", "1", "01/01/2026"],
      ["2", "Victor", "Residencial Teste", "G", "Andaime", "Z", "F", "", "", "1", "10", "Mês", "1", "01/01/2026"],
      [],
    ];
    const { linhas } = lerAba(m, "loc", ctx);
    expect(linhas.map((l) => l.linha)).toEqual([3, 4, 5, 6]);
    expect(linhas[0].erros).toEqual([]);
    expect(linhas[0].avisos).toEqual(['Categoria nova: "Gerador novo"', "Obra nova (será cadastrada)"]);
    expect((linhas[0].envio as { dados: Record<string, unknown> }).dados).toMatchObject({ valor_unitario: 1350.5, data_chegada: "2026-06-09", previsao_saida: "2026-09-09" });
    expect((linhas[0].envio as { diretoria_nome: string }).diretoria_nome).toBe("Victor");
    expect(linhas[1].erros).toEqual([
      'Diretoria: "Zé" fora da lista', "Diretoria obrigatório", "Valor unitário (R$): número inválido", "Valor unitário (R$) obrigatório",
      "Data de chegada: data inválida", "Data de chegada obrigatório", "Prazo deve ser maior que zero",
    ]);
    expect(linhas[2].erros).toEqual(["Código 99 não existe no sistema"]);
    expect(linhas[3].erros).toEqual(["Código 2 é de um imóvel; use a aba Imóveis"]);
  });

  it("datas e números", () => {
    expect(lerData(46182)).toBe("2026-06-09");
    expect(lerData(new Date(Date.UTC(2026, 5, 9)))).toBe("2026-06-09");
    expect(lerData("9/6/26")).toBe("2026-06-09");
    expect(lerData("2026-13-01")).toBeNull();
    expect(lerNumero("R$ 1.234,56")).toBe(1234.56);
    expect(lerNumero("1.350")).toBe(1350);
    expect(lerNumero("4.2")).toBe(4.2);
    expect(lerNumero("")).toBe("");
  });

  it("planilha antiga de imóveis: mapeia colunas e aponta o que falta", () => {
    const m = [
      ["CONTROLE GERAL DE LOCAÇÕES IMÓVEIS"],
      ["N°FTC", "N° COTAÇÃO", "STATUS", "LOCADOR", "CENTRO DE CUSTO", "RESPONSAVEL", "CNPJ/CPF", "EMAIL", "CONTATO", "TIPO DE IMOVEL",
        "PF/PJ", "LOGRADOURO", "ALOJADOS", "CRITÉRIOS DE REAJUSTE", "OBSERVAÇÕES", "INÍCIO", "TÉRMINO", "ALUGUEL", "IPTU", "INTERNET",
        "MÉDIO ENERGIA", "MÉDIO ÁGUA", "CONDOMÍNIO", "VENCIMENTO", "ALUGUEL PENDENTE", "SITUAÇÃO"],
      ["383-25", "11729", "ATIVO", "Imobiliária X", "Residencial Teste", "Gestor", "00.000.000/0001-00", "a@b.c", "(91) 9", "Base operacional",
        "PJ", "Av. Exemplo, 1", 10, "IGP-M anual", "obs", "15/08/2026", "15/08/2028", "50.000,00", 4296.93, 1500, 13871.6, "", "", 5, "", "EM DIA"],
      ["", "", "MOBILIZAR", "Locador PF", "Obra Desconhecida", "G2", "", "", "", "Casa", "PF", "Rua 2", "", "", "", "01/10/2026", "", "1500", "", "", "", "", "", "", "", ""],
    ];
    expect(ehPlanilhaAntiga(m)).toBe(true);
    const { linhas } = converterPlanilhaAntiga(m, ctx);
    expect(linhas[0].linha).toBe(3);
    expect(linhas[0].erros).toEqual([]);
    const d = (linhas[0].envio as { dados: { imovel: Record<string, unknown>; valor_unitario: number } }).dados;
    expect(d.valor_unitario).toBe(50000);
    expect(d.imovel).toMatchObject({ fase: "Ativo", tipo_uso: "Base operacional", capacidade: 10, iptu_quem: "ultra", iptu_valor: 4296.93,
      energia_quem: "ultra", agua_quem: "na", indice_reajuste: "IGP-M", dia_vencimento: 5, situacao_pagamento: "Em dia", numero_cotacao: "11729" });
    expect(linhas[1].erros).toContain("Diretoria obrigatória (obra nova): complete na planilha");
    expect(linhas[1].erros).toContain("Término do contrato obrigatório");
  });
});
