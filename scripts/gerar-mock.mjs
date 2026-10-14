// Gera src/mock-dev.json com dados de exemplo calculados pelo schema real (PGlite).
// Uso só em desenvolvimento, para ver as telas sem gravar no Supabase.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, writeFileSync } from "node:fs";

const db = new PGlite();
await db.exec("create role anon nologin; create role authenticated nologin;");
await db.exec(readFileSync(new URL("../supabase/schema.sql", import.meta.url), "utf8"));
const q = async (s, p = []) => (await db.query(s, p)).rows;
const U = "Usuário Exemplo";
await q("select loc_entrar($1)", [U]);
const dir = async (n) => (await q("select id from loc_diretorias where nome=$1", [n]))[0].id;
const cat = async (n) => (await q("select id from loc_categorias where nome=$1", [n]))[0].id;
const obra = async (n, d, g) => (await q("select loc_salvar_obra($1,null,$2,$3,$4) id", [U, n, await dir(d), g]))[0].id;
const item = async (o) => (await q("select loc_salvar_locacao($1,$2) id", [U, o]))[0].id;

const o1 = await obra("Residencial Exemplo", "Victor", "Gestor exemplo 1");
const o2 = await obra("Ed. Comercial Exemplo", "Bruno", "Gestor exemplo 2");
const o3 = await obra("Galpão Industrial Exemplo", "Wellington", "Gestor exemplo 3");
const o4 = await obra("Pavimentação Exemplo", "Cesar", "Gestor exemplo 4");
const o5 = await obra("Operação Araxá (exemplo)", "Bruno", "Gestor exemplo 8");
const o6 = await obra("Operação Maranhão (exemplo)", "Wellington", "Gestor exemplo 9");
const C = "Container (escritório, vestiário, sanitário, almoxarifado)";
const base = (o, c, desc, forn, val, prazo, cheg, prev, extra = {}) =>
  item({ obra_id: o, categoria_id: c, descricao: desc, fornecedor: forn, foc: "23393", ftc: "268-26", quantidade: 1, valor_unitario: val, unidade: "mes", prazo, data_chegada: cheg, previsao_saida: prev, ...extra });

await base(o1, await cat(C), "Container vestiário 6,00x2,40m", "Locadora exemplo", 890, 8, "2026-06-09", "2027-02-04");
await base(o1, await cat(C), "Container almoxarifado", "Locadora exemplo", 600, 8, "2026-06-09", "2026-10-20");
await base(o1, await cat(C), "Container escritório", "Locadora exemplo", 1100, 8, "2026-06-09", "2026-08-03");
await base(o2, await cat("Plataforma elevatória e balancim"), "Plataforma elevatória articulada", "Locadora A", 6500, 5, "2026-04-15", "2026-10-20");
await base(o2, await cat("Andaime"), "Andaime fachadeiro (m²)", "Locadora B", 4.2, 8, "2026-02-25", "2026-12-20", { quantidade: 850 });
await base(o3, await cat("Gerador e energia"), "Gerador 150 kVA", "Locadora D", 5200, 6, "2026-05-20", "2026-11-20");
await base(o3, await cat("Máquina de terraplenagem"), "Retroescavadeira com operador", "Locadora C", 21000, 4, "2026-08-01", "2027-02-28", { aditivo_status: "solicitado", aditivo_data: "2026-10-05" });
await base(o4, await cat("Equipamento de compactação"), "Rolo compactador liso", "Locadora E", 14000, 6, "2026-06-01", "2026-11-15");
await base(o4, await cat("Caminhão (munck, basculante, pipa)"), "Caminhão pipa 10.000 L", "Locadora E", 16000, 6, "2026-03-01", "2026-08-30", { data_devolucao: "2026-08-28" });
await base(o4, await cat("Ferramentas elétricas e manuais"), "Martelete rompedor", "Locadora F", 180, 10, "2026-09-20", "2026-10-25", { unidade: "dia" });
const im = await cat("Imóvel (alojamento, casa, base, galpão)");
const imovel = (o, desc, forn, val, cheg, term, prev, d) =>
  item({ obra_id: o, categoria_id: im, descricao: desc, fornecedor: forn, foc: "23410", ftc: "383-25", valor_unitario: val, data_chegada: cheg, previsao_saida: prev, imovel: { termino_contrato: term, aviso_previo_dias: 30, indice_reajuste: "IGP-M", locador_tipo: "PJ", locador_documento: "00.000.000/0001-00", locador_email: "contato@exemplo.com.br", locador_telefone: "(34) 90000-0000", ...d } });
await imovel(o5, "Alojamento administrativo — Araxá/MG", "Locador exemplo PF 1", 3100, "2026-03-20", "2027-03-20", "2027-02-28", { fase: "Ativo", tipo_uso: "Alojamento administrativo", capacidade: 2, cidade_uf: "Araxá/MG", endereco: "Rua Exemplo, 365", situacao_pagamento: "Em atraso", pendencias: "Aluguel de 09/2026", dia_vencimento: 20, garantia: "Sem garantia" });
await imovel(o5, "Alojamento operacional (5 aptos) — Araxá/MG", "Imobiliária Exemplo MG Ltda", 4600, "2025-04-15", "2026-10-30", "2027-03-31", { fase: "Ativo", tipo_uso: "Alojamento operacional", capacidade: 15, cidade_uf: "Araxá/MG", internet_quem: "ultra", internet_valor: 99.9, iptu_quem: "incluso", agua_quem: "incluso", energia_quem: "incluso", dia_vencimento: 7, garantia: "Caução", valor_garantia: 9200 });
await imovel(o6, "Almoxarifado — Timon/MA", "Locador exemplo PF 2", 955.8, "2025-05-15", "2027-05-14", "2026-11-05", { fase: "Desmobilizar", tipo_uso: "Almoxarifado", cidade_uf: "Timon/MA", agua_quem: "ultra", agua_valor: 116.19, energia_quem: "ultra", energia_valor: 166.33, iptu_quem: "locador" });
await imovel(o6, "Alojamento operacional — Pastos Bons/MA", "Locador exemplo PF 3", 800, "2024-03-01", "2026-03-01", "2026-12-31", { fase: "Tramitando", tipo_uso: "Alojamento operacional", capacidade: 6, cidade_uf: "Pastos Bons/MA", agua_quem: "ultra", agua_valor: 39.23, energia_quem: "ultra", energia_valor: 333.08, situacao_pagamento: "Em atraso", pendencias: "Aluguéis de 07, 08 e 09/2026" });
await imovel(o6, "Alojamento — Santana/AP", "Locador exemplo PF 5", 1500, "2026-10-25", "2027-10-25", "2027-06-30", { fase: "Mobilizar", tipo_uso: "Alojamento operacional", capacidade: 4, condominio_quem: "ultra", condominio_valor: 350 });
// uma edição para aparecer no histórico
const ed = (await q("select * from loc_locacoes where descricao='Container almoxarifado'"))[0];
await item({ ...ed, id: ed.id, previsao_saida: "2026-11-30", categoria_id: ed.categoria_id });
await q("select loc_criar_categoria($1,'Guincho elétrico')", [U]);

const json = async (t, ord = "id") => (await q(`select coalesce(json_agg(x order by ${ord}), '[]') j from ${t} x`))[0].j;
const out = {
  loc_diretorias: await json("loc_diretorias"),
  loc_obras: await json("loc_obras"),
  loc_categorias: await json("loc_categorias"),
  loc_usuarios: await json("loc_usuarios"),
  loc_locacoes_status: await json("loc_locacoes_status"),
  loc_imovel_detalhes: await json("loc_imovel_detalhes", "locacao_id"),
  loc_historico_view: await json("loc_historico_view", "em desc, id desc"),
};
writeFileSync(new URL("../src/mock-dev.json", import.meta.url), JSON.stringify(out));
console.log("ok", Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.length])));
