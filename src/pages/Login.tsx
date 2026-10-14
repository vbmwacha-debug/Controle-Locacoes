import { useEffect, useRef, useState, type FormEvent } from "react";
import { rpc } from "../lib/api";
import { ordemPt } from "../lib/format";
import { supabase } from "../lib/supabase";

export default function Login({ onEntrar }: { onEntrar: (nome: string) => void }) {
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState("");
  const [nomes, setNomes] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
    supabase
      .from("loc_usuarios")
      .select("nome")
      .is("unido_a_id", null)
      .then(({ data }) => setNomes(((data as { nome: string }[]) || []).map((u) => u.nome).sort(ordemPt)));
  }, []);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const n = nome.trim().replace(/\s+/g, " ");
    if (n.length < 3 || !n.includes(" ")) {
      setErro("Escreva nome e sobrenome para entrar. Ele fica registrado em tudo o que você fizer.");
      ref.current?.focus();
      return;
    }
    setEnviando(true);
    try {
      const oficial = await rpc<string>("loc_entrar", { p_usuario_nome: n });
      onEntrar(oficial || n);
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="login">
      <div className="lcard">
        <div className="lh">
          <h1>Ultra · Controle de Locações</h1>
          <span style={{ fontSize: 13, opacity: 0.9 }}>Identifique-se para entrar</span>
        </div>
        <form onSubmit={enviar} noValidate>
          <div className="field">
            <label htmlFor="lgNome">Seu nome</label>
            <input
              id="lgNome"
              ref={ref}
              autoComplete="name"
              list="lgNomes"
              placeholder="Nome e sobrenome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
            <datalist id="lgNomes">
              {nomes.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </div>
          <p className="muted" style={{ margin: 0 }}>
            Sem senha. Seu nome fica registrado em tudo o que você incluir ou alterar, na aba Histórico.
          </p>
          <p className="err" style={{ margin: 0, minWidth: 0 }} role="alert">
            {erro}
          </p>
          <button className="btn primary" type="submit" disabled={enviando}>
            {enviando ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
