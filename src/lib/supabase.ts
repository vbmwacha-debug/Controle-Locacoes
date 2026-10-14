import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const configurado = Boolean(url && key);

export const supabase = createClient(url || "http://localhost", key || "sem-chave", {
  auth: { persistSession: false, autoRefreshToken: false },
  // usa sempre o fetch atual da janela (permite o modo de demonstração em desenvolvimento)
  global: { fetch: (...a: Parameters<typeof fetch>) => window.fetch(...a) },
});
