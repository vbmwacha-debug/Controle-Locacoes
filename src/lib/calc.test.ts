import { describe, expect, it } from "vitest";
import { calc, proximoAniversario, type CalcInput } from "./calc";
import { addMeses } from "./datas";

const HOJE = "2026-10-01";

const item = (o: Partial<CalcInput>): CalcInput => ({
  quantidade: 1,
  valor_unitario: 1100,
  unidade: "mes",
  prazo: 8,
  data_chegada: "2026-06-09",
  previsao_saida: null,
  aditivo_status: "",
  aditivo_data: null,
  data_devolucao: null,
  ...o,
});

describe("status (casos obrigatórios, hoje = 01/10/2026)", () => {
  it("previsão 03/08/2026 → Saída atrasada", () => {
    expect(calc(item({ previsao_saida: "2026-08-03" }), HOJE).statusLabel).toBe("Saída atrasada");
  });
  it("previsão 03/10/2026 → Programar devolução", () => {
    expect(calc(item({ previsao_saida: "2026-10-03" }), HOJE).statusLabel).toBe("Programar devolução");
  });
  it("previsão 04/02/2027 → Prazo OK", () => {
    expect(calc(item({ previsao_saida: "2027-02-04" }), HOJE).statusLabel).toBe("Prazo OK");
  });
  it("chegada 15/04/2026, prazo 5 → Vencido sem cobertura", () => {
    const r = calc(item({ data_chegada: "2026-04-15", prazo: 5, previsao_saida: "2026-10-20" }), HOJE);
    expect(r.statusLabel).toBe("Vencido sem cobertura");
    expect(r.nota).toBe("Venceu há 16 dias");
  });
  it("chegada 25/02/2026, prazo 8, previsão 20/12/2026 → Aditar agora", () => {
    const r = calc(item({ data_chegada: "2026-02-25", prazo: 8, previsao_saida: "2026-12-20" }), HOJE);
    expect(r.statusLabel).toBe("Aditar agora");
    expect(r.nota).toBe("Contrato vence em 24 dias; obra precisa até 20/12/2026");
  });
});

describe("cálculos", () => {
  it("fim contratual, valor total e saldo", () => {
    const r = calc(item({ previsao_saida: "2027-02-04" }), HOJE);
    expect(r.fim).toBe("2027-02-09");
    expect(r.valorTotalFoc).toBe(8800);
    // 114 dias / 30,4375 = 3,745 meses usados
    expect(r.periodosUsados).toBeCloseTo(114 / 30.4375, 6);
    expect(r.saldo).toBeCloseTo(8800 - 1100 * (114 / 30.4375), 6);
  });
  it("saldo negativo depois do fim", () => {
    const r = calc(item({ data_chegada: "2026-04-15", prazo: 5 }), HOJE);
    expect(r.saldo).toBeLessThan(0);
  });
  it("semana e dia", () => {
    expect(calc(item({ unidade: "semana", prazo: 2 }), HOJE).fim).toBe("2026-06-23");
    expect(calc(item({ unidade: "dia", prazo: 10 }), HOJE).fim).toBe("2026-06-19");
    expect(calc(item({ unidade: "semana", valor_unitario: 100 }), HOJE).custoMensal).toBeCloseTo(434.5);
    expect(calc(item({ unidade: "dia", valor_unitario: 100 }), HOJE).custoMensal).toBeCloseTo(3043.75);
  });
  it("devolução encerra e congela", () => {
    const r = calc(item({ data_devolucao: "2026-08-09" }), HOJE);
    expect(r.statusLabel).toBe("Encerrado");
    expect(r.periodosUsados).toBeCloseTo(61 / 30.4375, 6);
  });
  it("aditivo solicitado → Em aditamento", () => {
    const r = calc(item({ data_chegada: "2026-02-25", previsao_saida: "2026-12-20", aditivo_status: "solicitado" }), HOJE);
    expect(r.statusLabel).toBe("Em aditamento");
  });
  it("prever aditivo", () => {
    const r = calc(item({ data_chegada: "2026-04-01", prazo: 8, previsao_saida: "2027-03-01" }), HOJE);
    expect(r.fim).toBe("2026-12-01");
    expect(r.statusLabel).toBe("Prever aditivo");
    expect(r.nota).toBe("Pedir aditivo até 01/11/2026");
  });
  it("vence em até 60 dias", () => {
    const r = calc(item({ data_chegada: "2026-04-15", prazo: 7, previsao_saida: "2026-11-01" }), HOJE);
    expect(r.statusLabel).toBe("Vence em até 60 dias");
  });
  it("mês no calendário: 31/01 + 1 mês = 28/02", () => {
    expect(addMeses("2026-01-31", 1)).toBe("2026-02-28");
  });
});

describe("imóveis", () => {
  const imovel = (o: Partial<NonNullable<CalcInput["imovel"]>> = {}, base: Partial<CalcInput> = {}) =>
    item({
      valor_unitario: 3000,
      data_chegada: "2026-03-20",
      previsao_saida: "2027-02-28",
      ...base,
      imovel: {
        termino_contrato: "2027-03-20",
        fase: "Ativo",
        aviso_previo_dias: 30,
        indice_reajuste: "IGP-M",
        encargos: { iptu: { quem: "ultra", valor: 200 }, energia: { quem: "incluso", valor: 999 } },
        ...o,
      },
    });
  it("fim = término, prazo em meses, custo com encargos da Ultra", () => {
    const r = calc(imovel(), HOJE);
    expect(r.fim).toBe("2027-03-20");
    expect(r.prazo).toBe(12);
    expect(r.custoMensal).toBe(3200);
    expect(r.proximoReajuste).toBe("2027-03-20");
    expect(r.avisarLocadorAte).toBe("2027-01-29");
    expect(r.statusLabel).toBe("Prazo OK");
  });
  it("reajuste: início futuro ou recente → 1 ano depois do início", () => {
    expect(proximoAniversario("2026-10-25", HOJE)).toBe("2027-10-25");
    expect(proximoAniversario("2026-03-20", HOJE)).toBe("2027-03-20");
    expect(proximoAniversario("2024-12-01", HOJE)).toBe("2026-12-01");
    expect(proximoAniversario("2024-02-29", HOJE)).toBe("2027-02-28");
  });
  it("Mobilizar → Em contratação", () => {
    expect(calc(imovel({ fase: "Mobilizar" }), HOJE).statusLabel).toBe("Em contratação");
  });
  it("Tramitando → Em aditamento", () => {
    expect(calc(imovel({ fase: "Tramitando" }), HOJE).statusLabel).toBe("Em aditamento");
  });
  it("Desmobilizado → Encerrado", () => {
    expect(calc(imovel({ fase: "Desmobilizado" }), HOJE).statusLabel).toBe("Encerrado");
  });
  it("Desmobilizar → Programar devolução; com previsão passada → Saída atrasada", () => {
    expect(calc(imovel({ fase: "Desmobilizar" }), HOJE).statusLabel).toBe("Programar devolução");
    expect(calc(imovel({ fase: "Desmobilizar" }, { previsao_saida: "2026-09-30" }), HOJE).statusLabel).toBe("Saída atrasada");
  });
  it("janela = 15 dias + aviso prévio", () => {
    const r = calc(imovel({}, { previsao_saida: "2026-11-15" }), HOJE); // 45 dias
    expect(r.statusLabel).toBe("Programar devolução");
    expect(r.nota).toBe("Avisar o locador até 16/10/2026 (aviso de 30 dias)");
  });
});
