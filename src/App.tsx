import { useState } from "react";
import { Tooltip } from "./components/comum";
import FichaImovel from "./components/FichaImovel";
import ImportarExportar from "./components/ImportarExportar";
import { AppProvider, useApp, type Aba } from "./estado";
import { rpc } from "./lib/api";
import { configurado } from "./lib/supabase";
import Configuracoes from "./pages/Configuracoes";
import Historico from "./pages/Historico";
import Imoveis from "./pages/Imoveis";
import Lancamentos from "./pages/Lancamentos";
import Login from "./pages/Login";
import Obras from "./pages/Obras";
import Painel from "./pages/Painel";
import Regras from "./pages/Regras";

const CHAVE = "ultra_loc_user";
const SESSAO = "ultra_loc_entrou";

/** Quem volta com o nome lembrado também gera um 'entrou' no histórico (uma vez por sessão do navegador). */
function registrarEntradaDaSessao(nome: string) {
  try {
    if (sessionStorage.getItem(SESSAO) === nome) return;
    sessionStorage.setItem(SESSAO, nome);
  } catch {
    return;
  }
  rpc("loc_entrar", { p_usuario_nome: nome }).catch(() => {});
}
const ler = () => {
  try {
    return localStorage.getItem(CHAVE) || "";
  } catch {
    return "";
  }
};

export default function App() {
  const [usuario, setUsuario] = useState(ler);

  if (!configurado) {
    return (
      <div className="carregando">
        Configuração ausente: crie o arquivo <b>.env.local</b> com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (veja o README).
      </div>
    );
  }
  if (!usuario) {
    return (
      <Login
        onEntrar={(n) => {
          try {
            localStorage.setItem(CHAVE, n);
            sessionStorage.setItem(SESSAO, n);
          } catch {
            /* navegador sem armazenamento: pede o nome de novo na próxima visita */
          }
          setUsuario(n);
        }}
      />
    );
  }
  registrarEntradaDaSessao(usuario);
  const sair = () => {
    try {
      localStorage.removeItem(CHAVE);
    } catch {
      /* ignora */
    }
    setUsuario("");
  };
  return (
    <AppProvider usuario={usuario} sair={sair}>
      <Casca />
    </AppProvider>
  );
}

const ABAS: [Aba, string][] = [
  ["painel", "Painel geral"],
  ["obra", "Lançamentos da obra"],
  ["imoveis", "Imóveis"],
  ["hist", "Histórico"],
  ["obras", "Obras"],
  ["config", "Configurações"],
  ["regras", "Regras e campos"],
];

function Casca() {
  const { usuario, sair, aba, irPara, dados, erroCarga, recarregar } = useApp();
  const hoje = new Date().toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo", weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });
  return (
    <>
      <header className="top">
        <div className="top-in">
          <div className="brandrow">
            <h1>
              Ultra <span>· Controle de Locações</span>
            </h1>
            <div className="rightrow">
              <div className="who">
                <span>
                  Entrou como <b>{usuario}</b>
                </span>
                <button type="button" onClick={sair}>
                  Trocar usuário
                </button>
              </div>
              <div className="today">Hoje: {hoje}</div>
            </div>
          </div>
          <nav className="tabs" role="tablist">
            {ABAS.map(([k, l]) => (
              <button key={k} className="tab" role="tab" aria-selected={aba === k} onClick={() => irPara(k)}>
                {l}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main>
        {erroCarga ? (
          <div className="panel">
            <p className="erro">Não foi possível carregar os dados: {erroCarga}</p>
            <div>
              <button className="btn" onClick={recarregar}>
                Tentar de novo
              </button>
            </div>
          </div>
        ) : !dados ? (
          <div className="carregando">Carregando…</div>
        ) : (
          <>
            {aba === "painel" && <Painel />}
            {aba === "obra" && <Lancamentos />}
            {aba === "imoveis" && <Imoveis />}
            {aba === "hist" && <Historico />}
            {aba === "obras" && <Obras />}
            {aba === "config" && <Configuracoes />}
            {aba === "regras" && <Regras />}
            <FichaImovel />
            <ImportarExportar />
          </>
        )}
      </main>
      <Tooltip />
    </>
  );
}
