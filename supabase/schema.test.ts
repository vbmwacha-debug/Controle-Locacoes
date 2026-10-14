// Roda o supabase/schema.sql num Postgres embutido (PGlite) e confere regras, histórico e permissões.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { calc, type CalcInput } from "../src/lib/calc";

const sql = readFileSync(new URL("./schema.sql", import.meta.url), "utf8");
let db: PGlite;

const one = async <T = Record<string, unknown>>(q: string, p: unknown[] = []) =>
  (await db.query<T>(q, p)).rows[0];

beforeAll(async () => {
  db = new PGlite();
  // papéis que o Supabase já tem
  await db.exec(`create role anon nologin; create role authenticated nologin;`);
  await db.exec(sql);
  await db.exec(sql); // rodar duas vezes não pode quebrar
}, 60000);

const HOJE = "2026-10-01";
const casos: [string, Partial<CalcInput>, string][] = [
  ["saída atrasada", { previsao_saida: "2026-08-03" }, "Saída atrasada"],
  ["programar", { previsao_saida: "2026-10-03" }, "Programar devolução"],
  ["ok", { previsao_saida: "2027-02-04" }, "Prazo OK"],
  ["vencido", { data_chegada: "2026-04-15", prazo: 5, previsao_saida: "2026-10-20" }, "Vencido sem cobertura"],
  ["aditar", { data_chegada: "2026-02-25", previsao_saida: "2026-12-20" }, "Aditar agora"],
  ["prever", { data_chegada: "2026-04-01", previsao_saida: "2027-03-01" }, "Prever aditivo"],
  ["atenção", { data_chegada: "2026-04-15", prazo: 7, previsao_saida: "2026-11-01" }, "Vence em até 60 dias"],
  ["aditamento", { data_chegada: "2026-02-25", previsao_saida: "2026-12-20", aditivo_status: "solicitado", aditivo_data: "2026-09-25" }, "Em aditamento"],
  ["semana", { unidade: "semana", prazo: 20, previsao_saida: "2026-10-10" }, "Programar devolução"],
  ["devolvido", { data_devolucao: "2026-08-09" }, "Encerrado"],
];

const base = (o: Partial<CalcInput>): CalcInput => ({
  quantidade: 1, valor_unitario: 1100, unidade: "mes", prazo: 8, data_chegada: "2026-06-09",
  previsao_saida: null, aditivo_status: "", aditivo_data: null, data_devolucao: null, ...o,
});

async function sqlCalc(i: CalcInput) {
  const im = i.imovel;
  const enc = im ? Object.values(im.encargos).reduce((s, e) => s + (e?.quem === "ultra" ? Number(e.valor) || 0 : 0), 0) : 0;
  return one<Record<string, unknown>>(
    `select * from loc_calcular($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
    [i.quantidade, i.valor_unitario, i.unidade, i.prazo, i.data_chegada, i.previsao_saida, i.aditivo_status,
     i.aditivo_data, i.data_devolucao, !!im, im?.termino_contrato ?? null, im?.fase ?? null,
     im?.aviso_previo_dias ?? null, im?.indice_reajuste ?? null, enc, HOJE],
  );
}
const iso = (d: unknown) => (d instanceof Date ? d.toISOString().slice(0, 10) : (d as string | null));

describe("loc_calcular igual ao calc.ts", () => {
  for (const [nome, o, esperado] of casos) {
    it(nome, async () => {
      const i = base(o);
      const t = calc(i, HOJE);
      const s = await sqlCalc(i);
      expect(s.status_label).toBe(esperado);
      expect(t.statusLabel).toBe(esperado);
      expect(s.nota).toBe(t.nota);
      expect(iso(s.fim_contratual)).toBe(t.fim);
      expect(Number(s.saldo)).toBeCloseTo(t.saldo, 4);
      expect(Number(s.custo_mensal)).toBeCloseTo(t.custoMensal, 4);
    });
  }
  const imoveis: [string, Partial<NonNullable<CalcInput["imovel"]>>, Partial<CalcInput>][] = [
    ["imóvel ok", {}, {}],
    ["mobilizar", { fase: "Mobilizar" }, {}],
    ["tramitando", { fase: "Tramitando" }, {}],
    ["desmobilizar", { fase: "Desmobilizar" }, {}],
    ["desmobilizar atrasado", { fase: "Desmobilizar" }, { previsao_saida: "2026-09-30" }],
    ["janela com aviso", {}, { previsao_saida: "2026-11-15" }],
    ["vencido tramitando", { fase: "Tramitando", termino_contrato: "2026-03-01" }, { data_chegada: "2024-03-01" }],
  ];
  for (const [nome, im, o] of imoveis) {
    it(nome, async () => {
      const i = base({
        valor_unitario: 3000, data_chegada: "2026-03-20", previsao_saida: "2027-02-28", ...o,
        imovel: { termino_contrato: "2027-03-20", fase: "Ativo", aviso_previo_dias: 30, indice_reajuste: "IGP-M",
          encargos: { iptu: { quem: "ultra", valor: 200 }, agua: { quem: "incluso", valor: null } }, ...im },
      });
      const t = calc(i, HOJE);
      const s = await sqlCalc(i);
      expect(s.status_label).toBe(t.statusLabel);
      expect(s.nota).toBe(t.nota);
      expect(Number(s.prazo_calculado)).toBe(t.prazo);
      expect(iso(s.proximo_reajuste)).toBe(t.proximoReajuste);
      expect(iso(s.avisar_locador_ate)).toBe(t.avisarLocadorAte);
      expect(Number(s.custo_mensal)).toBeCloseTo(t.custoMensal, 4);
    });
  }
});

describe("gravação pelas funções RPC", () => {
  it("nome precisa de sobrenome", async () => {
    await expect(db.query(`select loc_entrar('Victor')`)).rejects.toThrow(/nome e sobrenome/);
  });

  it("entrar, criar obra, item, editar com resumo, aditivo e devolução", async () => {
    const nome = (await one<{ v: string }>(`select loc_entrar('  Víctor   Wacha ') v`)).v;
    expect(nome).toBe("Víctor Wacha");
    // mesmo nome sem acento e minúsculo = mesmo usuário
    expect((await one<{ v: string }>(`select loc_entrar('victor wacha') v`)).v).toBe("Víctor Wacha");
    expect((await one<{ n: number }>(`select count(*)::int n from loc_usuarios`)).n).toBe(1);

    const dir = (await one<{ id: number }>(`select id from loc_diretorias where nome='Victor'`)).id;
    const obra = (await one<{ v: number }>(`select loc_salvar_obra('Victor Wacha', null, 'Residencial Teste', $1, 'Gestor Um') v`, [dir])).v;
    const cat = (await one<{ id: number }>(`select id from loc_categorias where nome='Andaime'`)).id;
    const dados = { obra_id: obra, categoria_id: cat, descricao: "Andaime fachadeiro", fornecedor: "Locadora X",
      foc: "23393", quantidade: 1, valor_unitario: 1100, unidade: "mes", prazo: 8,
      data_chegada: "2026-06-09", previsao_saida: "2026-08-03" };
    const id = (await one<{ v: number }>(`select loc_salvar_locacao('Victor Wacha', $1) v`, [dados])).v;
    expect(id).toBeGreaterThan(0);

    await db.query(`select loc_salvar_locacao('Victor Wacha', $1)`, [{ ...dados, id, previsao_saida: "2026-11-30" }]);
    const h = await one<{ resumo: string }>(`select resumo from loc_historico where locacao_id=$1 and acao='editou'`, [id]);
    expect(h.resumo).toBe("Previsão de saída: 03/08/2026 → 30/11/2026");

    await db.query(`select loc_solicitar_aditivo('Victor Wacha', $1)`, [id]);
    await db.query(`select loc_devolver('Victor Wacha', $1, '2026-10-01')`, [id]);
    const st = await one<{ status: string }>(`select status from loc_locacoes_status where id=$1`, [id]);
    expect(st.status).toBe("encerrado");
    const acoes = (await db.query<{ acao: string }>(`select acao from loc_historico order by id`)).rows.map((r) => r.acao);
    expect(acoes).toEqual(["entrou", "entrou", "criou", "criou", "editou", "solicitou aditivo", "devolveu"]);
  });

  it("categoria nova pelo formulário e reaproveitamento sem acento", async () => {
    const obra = (await one<{ id: number }>(`select id from loc_obras limit 1`)).id;
    const d = { obra_id: obra, categoria_nova: "Guincho Elétrico", descricao: "Guincho", fornecedor: "F",
      quantidade: 1, valor_unitario: 10, unidade: "dia", prazo: 5, data_chegada: "2026-09-01" };
    await db.query(`select loc_salvar_locacao('Victor Wacha', $1)`, [d]);
    await db.query(`select loc_salvar_locacao('Victor Wacha', $1)`, [{ ...d, categoria_nova: "guincho eletrico" }]);
    expect((await one<{ n: number }>(`select count(*)::int n from loc_categorias where loc_normalizar(nome)='guincho eletrico'`)).n).toBe(1);
  });

  it("imóvel: detalhes, resumo da fase e dados pessoais mascarados", async () => {
    const obra = (await one<{ id: number }>(`select id from loc_obras limit 1`)).id;
    const cat = (await one<{ id: number }>(`select id from loc_categorias where nome=loc_cat_imovel()`)).id;
    const d = { obra_id: obra, categoria_id: cat, descricao: "Alojamento", fornecedor: "Locador PF",
      valor_unitario: 3000, data_chegada: "2026-03-20", previsao_saida: "2027-02-28",
      imovel: { termino_contrato: "2027-03-20", fase: "Ativo", locador_documento: "000.000.000-00",
        iptu_valor: 200, condominio_quem: "incluso", condominio_valor: 50, aviso_previo_dias: 30, indice_reajuste: "IGP-M" } };
    const id = (await one<{ v: number }>(`select loc_salvar_locacao('Victor Wacha', $1) v`, [d])).v;
    const det = await one<Record<string, unknown>>(`select * from loc_imovel_detalhes where locacao_id=$1`, [id]);
    expect(det.iptu_quem).toBe("ultra");
    expect(det.condominio_valor).toBeNull();
    expect(det.agua_quem).toBe("na");
    await db.query(`select loc_salvar_locacao('Victor Wacha', $1)`,
      [{ ...d, id, imovel: { ...d.imovel, fase: "Desmobilizar", locador_documento: "111.111.111-11" } }]);
    const h = await one<{ resumo: string; depois: string }>(
      `select resumo, depois::text from loc_historico where locacao_id=$1 and acao='editou'`, [id]);
    expect(h.resumo).toBe("Fase: Ativo → Desmobilizar · CPF / CNPJ do locador alterado");
    expect(h.depois).not.toContain("111.111");
    const v = await one<Record<string, unknown>>(`select prazo_calculado, custo_mensal from loc_locacoes_status where id=$1`, [id]);
    expect(Number(v.prazo_calculado)).toBe(12);
    expect(Number(v.custo_mensal)).toBe(3200);
  });

  it("importação é tudo ou nada", async () => {
    const antes = (await one<{ n: number }>(`select count(*)::int n from loc_locacoes`)).n;
    const ok = { aba: "Locações", linha: 2, obra_nome: "Obra Importada", diretoria_nome: "bruno", gestor_nome: "G",
      categoria_nome: "Andaime", dados: { descricao: "A", fornecedor: "F", quantidade: 1, valor_unitario: 1,
        unidade: "mes", prazo: 1, data_chegada: "2026-09-01" } };
    const ruim = { ...ok, linha: 3, dados: { ...ok.dados, id: 99999 } };
    await expect(db.query(`select loc_importar('Victor Wacha','x.xlsx',$1)`, [[ok, ruim]])).rejects.toThrow(/linha 3: Código 99999/);
    expect((await one<{ n: number }>(`select count(*)::int n from loc_locacoes`)).n).toBe(antes);
    const r = await one<{ v: { incluidas: number; obras_novas: number } }>(`select loc_importar('Victor Wacha','x.xlsx',$1) v`, [[ok]]);
    expect(r.v.incluidas).toBe(1);
    expect(r.v.obras_novas).toBe(1);
  });

  it("juntar usuários reflete no histórico", async () => {
    await db.query(`select loc_entrar('Vitor Wacha')`);
    const o = (await one<{ id: number }>(`select id from loc_usuarios where nome='Vitor Wacha'`)).id;
    const d = (await one<{ id: number }>(`select id from loc_usuarios where nome='Víctor Wacha'`)).id;
    await db.query(`select loc_juntar_usuarios('Víctor Wacha', $1, $2)`, [o, d]);
    expect((await one<{ v: string }>(`select loc_entrar('Vitor Wacha') v`)).v).toBe("Víctor Wacha");
    const n = await one<{ n: number }>(`select count(*)::int n from loc_historico_view where usuario_nome='Vitor Wacha' and usuario<>'Víctor Wacha'`);
    expect(n.n).toBe(0);
  });
});

describe("segurança", () => {
  it("anon lê, mas não escreve direto nas tabelas", async () => {
    await db.exec(`set role anon`);
    try {
      const r = await db.query(`select count(*) from loc_locacoes_status`);
      expect(r.rows.length).toBe(1);
      await expect(db.query(`insert into loc_diretorias(nome) values ('Hacker')`)).rejects.toThrow();
      await expect(db.query(`update loc_locacoes set valor_unitario = 0`)).rejects.toThrow();
      await expect(db.query(`select loc_int_gravar('a b', '{}'::jsonb, false)`)).rejects.toThrow();
      // RPC pública funciona
      await db.query(`select loc_entrar('Anon Teste')`);
    } finally {
      await db.exec(`reset role`);
    }
  });
  it("histórico não pode ser alterado nem apagado", async () => {
    await expect(db.query(`update loc_historico set resumo='x'`)).rejects.toThrow(/não pode ser alterado/);
    await expect(db.query(`delete from loc_historico`)).rejects.toThrow(/não pode ser alterado/);
  });
});
