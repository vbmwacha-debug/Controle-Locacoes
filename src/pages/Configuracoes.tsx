import { useState } from "react";
import { opcoes } from "../components/comum";
import { useAcao, useApp } from "../estado";
import { CAT_IMOVEL } from "../lib/calc";
import { fmtDataHora } from "../lib/datas";
import { ordemPt } from "../lib/format";

/** Linha com um par "escolher outro + botão" (juntar). */
function Juntar({ itens, rotulo, onJuntar }: { itens: [number, string][]; rotulo: string; onJuntar: (destino: number) => void }) {
  const [dest, setDest] = useState("");
  const [conf, setConf] = useState(false);
  if (!itens.length) return null;
  return conf ? (
    <span className="confirm">
      Juntar em <b>{itens.find(([i]) => String(i) === dest)?.[1]}</b>? Não dá para desfazer.
      <button className="btn small primary" onClick={() => { onJuntar(+dest); setConf(false); setDest(""); }}>
        Confirmar
      </button>
      <button className="btn small" onClick={() => setConf(false)}>
        Cancelar
      </button>
    </span>
  ) : (
    <span className="inline">
      <select aria-label={rotulo} value={dest} onChange={(e) => setDest(e.target.value)}>
        <option value="">{rotulo}…</option>
        {opcoes(itens)}
      </select>
      <button className="btn small" disabled={!dest} onClick={() => setConf(true)}>
        Juntar
      </button>
    </span>
  );
}

function Renomear({ atual, onSalvar }: { atual: string; onSalvar: (novo: string) => void }) {
  const [v, setV] = useState<string | null>(null);
  if (v === null)
    return (
      <button className="btn small" onClick={() => setV(atual)}>
        Renomear
      </button>
    );
  return (
    <span className="inline">
      <input aria-label="Novo nome" value={v} onChange={(e) => setV(e.target.value)} autoFocus />
      <button className="btn small primary" onClick={() => { onSalvar(v); setV(null); }}>
        Salvar
      </button>
      <button className="btn small" onClick={() => setV(null)}>
        Cancelar
      </button>
    </span>
  );
}

export default function Configuracoes() {
  const { dados } = useApp();
  const acao = useAcao();
  const d = dados!;
  const [novaDir, setNovaDir] = useState("");
  const [novaCat, setNovaCat] = useState("");

  const usuarios = d.usuarios.filter((u) => !u.unido_a_id).sort((a, b) => ordemPt(a.nome, b.nome));
  const juntados = d.usuarios.filter((u) => u.unido_a_id);
  const categorias = [...d.categorias].sort((a, b) => ordemPt(a.nome, b.nome));
  const usoCat = (id: number) => d.locacoes.filter((l) => l.categoria_id === id).length;

  return (
    <section className="view">
      <div className="bar">
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <h2>Configurações</h2>
          <span className="muted">Usuários, diretorias e categorias. Toda mudança aqui vai para o Histórico.</span>
        </div>
      </div>

      <div className="panel">
        <h3>Usuários</h3>
        <p className="muted" style={{ margin: 0 }}>
          Se a mesma pessoa entrou com nomes escritos de jeitos diferentes, junte o nome errado no nome certo. O histórico passa a
          mostrar o nome certo e quem digitar o nome antigo entra com o certo.
        </p>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Diretoria</th>
                <th>Último acesso</th>
                <th>Juntar este nome em</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id}>
                  <td>
                    <b>{u.nome}</b>
                    {juntados.some((j) => j.unido_a_id === u.id) && (
                      <span className="note">
                        Também: {juntados.filter((j) => j.unido_a_id === u.id).map((j) => j.nome).join(", ")}
                      </span>
                    )}
                  </td>
                  <td>
                    <select
                      aria-label={`Diretoria de ${u.nome}`}
                      value={u.diretoria_id ?? ""}
                      onChange={(e) => acao("loc_definir_diretoria_usuario", { p_usuario_id: u.id, p_diretoria_id: e.target.value ? +e.target.value : null }, "Diretoria do usuário atualizada.")}
                    >
                      <option value="">—</option>
                      {opcoes(d.diretorias.map((x) => [x.id, x.nome]))}
                    </select>
                  </td>
                  <td>{u.ultimo_acesso ? fmtDataHora(u.ultimo_acesso) : "—"}</td>
                  <td>
                    <Juntar
                      rotulo="Escolha o nome certo"
                      itens={usuarios.filter((x) => x.id !== u.id).map((x) => [x.id, x.nome])}
                      onJuntar={(dest) => acao("loc_juntar_usuarios", { p_origem_id: u.id, p_destino_id: dest }, "Nomes juntados.")}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <h3>Diretorias</h3>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Diretoria</th>
                <th className="num">Obras</th>
                <th>Situação</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {d.diretorias.map((x) => (
                <tr key={x.id} className={x.ativo ? "" : "done"}>
                  <td>
                    <b>{x.nome}</b>
                  </td>
                  <td className="num">{d.obras.filter((o) => o.diretoria_id === x.id).length}</td>
                  <td>
                    <button className="btn small" onClick={() => acao("loc_salvar_diretoria", { p_id: x.id, p_nome: x.nome, p_ativo: !x.ativo }, "Diretoria atualizada.")}>
                      {x.ativo ? "Ativa · desativar" : "Inativa · reativar"}
                    </button>
                  </td>
                  <td>
                    <Renomear atual={x.nome} onSalvar={(n) => acao("loc_salvar_diretoria", { p_id: x.id, p_nome: n, p_ativo: x.ativo }, "Diretoria renomeada.")} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="inline">
          <input aria-label="Nova diretoria" placeholder="Nova diretoria" value={novaDir} onChange={(e) => setNovaDir(e.target.value)} />
          <button className="btn small primary" disabled={!novaDir.trim()} onClick={async () => { await acao("loc_salvar_diretoria", { p_id: null, p_nome: novaDir, p_ativo: true }, "Diretoria cadastrada."); setNovaDir(""); }}>
            Adicionar
          </button>
        </div>
      </div>

      <div className="panel">
        <h3>Categorias</h3>
        <p className="muted" style={{ margin: 0 }}>
          Renomeie categorias escritas errado ou junte duplicadas (os itens passam para a categoria escolhida). A categoria de imóveis
          é fixa.
        </p>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Categoria</th>
                <th className="num">Itens</th>
                <th>Origem</th>
                <th></th>
                <th>Juntar em</th>
              </tr>
            </thead>
            <tbody>
              {categorias.map((c) => (
                <tr key={c.id}>
                  <td>
                    <b>{c.nome}</b>
                  </td>
                  <td className="num">{usoCat(c.id)}</td>
                  <td>{c.sugerida ? "Sugerida" : `Criada por ${c.criado_por || "—"}`}</td>
                  <td>{c.nome !== CAT_IMOVEL && <Renomear atual={c.nome} onSalvar={(n) => acao("loc_renomear_categoria", { p_id: c.id, p_nome: n }, "Categoria renomeada.")} />}</td>
                  <td>
                    {c.nome !== CAT_IMOVEL && (
                      <Juntar
                        rotulo="Escolha a categoria"
                        itens={categorias.filter((x) => x.id !== c.id && x.nome !== CAT_IMOVEL).map((x) => [x.id, x.nome])}
                        onJuntar={(dest) => acao("loc_juntar_categorias", { p_origem_id: c.id, p_destino_id: dest }, "Categorias juntadas.")}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="inline">
          <input aria-label="Nova categoria" placeholder="Nova categoria" value={novaCat} onChange={(e) => setNovaCat(e.target.value)} />
          <button className="btn small primary" disabled={!novaCat.trim()} onClick={async () => { await acao("loc_criar_categoria", { p_nome: novaCat }, "Categoria gravada."); setNovaCat(""); }}>
            Adicionar
          </button>
        </div>
      </div>
    </section>
  );
}
