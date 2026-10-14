import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { carregarDados, rpc, type Dados } from "./lib/api";
import { CAT_IMOVEL } from "./lib/calc";

export type Aba = "painel" | "obra" | "imoveis" | "hist" | "obras" | "config" | "regras";

interface Estado {
  usuario: string;
  sair: () => void;
  dados: Dados | null;
  erroCarga: string;
  recarregar: () => Promise<void>;
  aviso: (msg: string) => void;
  aba: Aba;
  irPara: (a: Aba) => void;
  obraSel: number | null;
  setObraSel: (id: number | null) => void;
  /** Abre o formulário de edição do item (na aba da obra). */
  editarItem: (id: number) => void;
  /** Abre o formulário de novo item (opcionalmente já como imóvel). */
  novoItem: (imovel?: boolean) => void;
  pedidoForm: { id: number | null; imovel: boolean; n: number } | null;
  limparPedidoForm: () => void;
  fichaId: number | null;
  abrirFicha: (id: number) => void;
  fecharFicha: () => void;
  importAberto: boolean;
  setImportAberto: (v: boolean) => void;
  catImovelId: number | null;
}

const Ctx = createContext<Estado | null>(null);
export const useApp = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useApp fora do provider");
  return c;
};

export function AppProvider({ usuario, sair, children }: { usuario: string; sair: () => void; children: ReactNode }) {
  const [dados, setDados] = useState<Dados | null>(null);
  const [erroCarga, setErroCarga] = useState("");
  const [msg, setMsg] = useState("");
  const [aba, setAba] = useState<Aba>("painel");
  const [obraSel, setObraSel] = useState<number | null>(null);
  const [pedidoForm, setPedidoForm] = useState<Estado["pedidoForm"]>(null);
  const [fichaId, setFichaId] = useState<number | null>(null);
  const [importAberto, setImportAberto] = useState(false);
  const tRef = useRef<number>();

  const recarregar = useCallback(async () => {
    try {
      setDados(await carregarDados());
      setErroCarga("");
    } catch (e) {
      setErroCarga((e as Error).message);
    }
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  const aviso = useCallback((m: string) => {
    setMsg(m);
    window.clearTimeout(tRef.current);
    tRef.current = window.setTimeout(() => setMsg(""), 3600);
  }, []);

  const irPara = useCallback((a: Aba) => {
    setAba(a);
    window.scrollTo({ top: 0 });
  }, []);

  const catImovelId = dados?.categorias.find((c) => c.nome === CAT_IMOVEL)?.id ?? null;

  const editarItem = (id: number) => {
    const l = dados?.locacoes.find((x) => x.id === id);
    if (l) setObraSel(l.obra_id);
    setFichaId(null);
    setAba("obra");
    setPedidoForm({ id, imovel: !!l?.e_imovel, n: Date.now() });
  };
  const novoItem = (imovel = false) => {
    setAba("obra");
    setPedidoForm({ id: null, imovel, n: Date.now() });
  };

  const v: Estado = {
    usuario,
    sair,
    dados,
    erroCarga,
    recarregar,
    aviso,
    aba,
    irPara,
    obraSel,
    setObraSel,
    editarItem,
    novoItem,
    pedidoForm,
    limparPedidoForm: () => setPedidoForm(null),
    fichaId,
    abrirFicha: setFichaId,
    fecharFicha: () => setFichaId(null),
    importAberto,
    setImportAberto,
    catImovelId,
  };
  return (
    <Ctx.Provider value={v}>
      {children}
      {msg && (
        <div className="toast" role="status">
          {msg}
        </div>
      )}
    </Ctx.Provider>
  );
}

/** Chama uma RPC, mostra o erro do banco como aviso e recarrega os dados. */
export function useAcao() {
  const { usuario, aviso, recarregar } = useApp();
  return useCallback(
    async <T,>(fn: string, args: Record<string, unknown>, ok?: string): Promise<T | undefined> => {
      try {
        const r = await rpc<T>(fn, { p_usuario_nome: usuario, ...args });
        await recarregar();
        if (ok) aviso(ok);
        return r;
      } catch (e) {
        aviso((e as Error).message);
        return undefined;
      }
    },
    [usuario, aviso, recarregar],
  );
}
