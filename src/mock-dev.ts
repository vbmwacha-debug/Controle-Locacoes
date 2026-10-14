// SOMENTE DESENVOLVIMENTO: troca as chamadas ao Supabase por dados de exemplo (src/mock-dev.json,
// gerado por "node scripts/gerar-mock.mjs") e bloqueia qualquer gravação.
// Ativado no console do navegador com sessionStorage.loc_mock = "1".
export async function instalarMock() {
  const dados = (await import("./mock-dev.json")).default as unknown as Record<string, unknown[]>;
  const original = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const m = url.match(/\/rest\/v1\/(rpc\/)?([a-z_]+)/);
    if (!m) return original(input, init);
    if (m[1]) {
      return new Response(JSON.stringify({ message: "Modo de demonstração: nada é gravado." }), { status: 400, headers: { "content-type": "application/json" } });
    }
    let rows = (dados[m[2]] || []) as Record<string, unknown>[];
    const u = new URL(url);
    for (const [k, v] of u.searchParams) {
      if (["select", "order", "limit", "offset", "or"].includes(k)) continue;
      const [op, val] = [v.slice(0, v.indexOf(".")), v.slice(v.indexOf(".") + 1)];
      if (op === "eq") rows = rows.filter((r) => String(r[k]) === val);
      if (op === "neq") rows = rows.filter((r) => String(r[k]) !== val);
      if (op === "is" && val === "null") rows = rows.filter((r) => r[k] == null);
    }
    const h = new Headers(init?.headers);
    const range = h.get("Range") || h.get("range");
    let de = 0, ate = rows.length - 1;
    if (range) [de, ate] = range.split("-").map(Number);
    const pag = rows.slice(de, ate + 1);
    const head = init?.method === "HEAD";
    return new Response(head ? null : JSON.stringify(pag), {
      status: 200,
      headers: { "content-type": "application/json", "content-range": `${de}-${de + pag.length - 1}/${rows.length}` },
    });
  };
}
