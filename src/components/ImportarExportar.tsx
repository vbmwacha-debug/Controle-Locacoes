import { useState } from "react";
import { useApp } from "../estado";
import { rpc } from "../lib/api";
import { baixarModelo, exportarDadosAtuais, lerArquivo } from "../lib/excel";
import { normalizar } from "../lib/format";
import { converterPlanilhaAntiga, ehPlanilhaAntiga, lerAba, type Contexto, type LinhaImport } from "../lib/planilha";
import { Chip, Drawer } from "./comum";

export default function ImportarExportar() {
  const { dados, importAberto, setImportAberto, usuario, recarregar, aviso } = useApp();
  const [msg, setMsg] = useState("");
  const [arquivo, setArquivo] = useState("");
  const [linhas, setLinhas] = useState<LinhaImport[]>([]);
  const [gravando, setGravando] = useState(false);
  const d = dados!;

  const fechar = () => {
    setImportAberto(false);
    setLinhas([]);
    setMsg("");
    setArquivo("");
  };

  async function gerar(fn: () => Promise<void>, ok: string) {
    try {
      setMsg("Gerando arquivo…");
      await fn();
      setMsg(ok);
    } catch (e) {
      setMsg("Não foi possível gerar o arquivo: " + (e as Error).message);
    }
  }

  async function ler(f: File) {
    setLinhas([]);
    setArquivo(f.name);
    setMsg("Lendo " + f.name + "…");
    try {
      const abas = await lerArquivo(await f.arrayBuffer());
      const ctx: Contexto = {
        diretorias: d.diretorias.map((x) => x.nome),
        categorias: d.categorias.map((x) => x.nome),
        codigos: new Map(d.locacoes.map((l) => [l.id, l.e_imovel])),
        obras: d.obras.map((o) => o.nome),
      };
      const notas: string[] = [];
      const out: LinhaImport[] = [];
      const acha = (n: string) => abas.find((a) => normalizar(a.nome) === n);
      const sl = acha("locacoes");
      const si = acha("imoveis");
      if (sl) {
        const r = lerAba(sl.matriz, "loc", ctx);
        if (r.erro) notas.push("Locações: " + r.erro);
        out.push(...r.linhas);
      }
      if (si) {
        const r = lerAba(si.matriz, "im", ctx);
        if (r.erro) notas.push("Imóveis: " + r.erro);
        out.push(...r.linhas);
      }
      if (!sl && !si) {
        // planilha antiga de imóveis ou arquivo com uma aba só
        const a = abas.find((x) => ehPlanilhaAntiga(x.matriz));
        if (a) {
          const r = converterPlanilhaAntiga(a.matriz, ctx);
          notas.push(`Planilha "CONTROLE GERAL DE LOCAÇÕES IMÓVEIS" reconhecida (aba ${a.nome}).`);
          if (r.erro) notas.push(r.erro);
          out.push(...r.linhas);
        } else if (abas[0]) {
          const r = lerAba(abas[0].matriz, "loc", ctx);
          if (r.erro) notas.push(r.erro);
          out.push(...r.linhas);
        }
      }
      setLinhas(out);
      const ok = out.filter((l) => !l.erros.length);
      const novos = ok.filter((l) => !l.codigo).length;
      setMsg(
        `${f.name}: ${out.length} linhas lidas · ${novos} novas · ${ok.length - novos} atualizações · ${out.length - ok.length} com erro.` +
          (notas.length ? " " + notas.join(" ") : ""),
      );
    } catch {
      setMsg("Não consegui ler esse arquivo. Confira se é o modelo .xlsx do sistema.");
    }
  }

  async function importar() {
    const ok = linhas.filter((l) => !l.erros.length);
    setGravando(true);
    try {
      const r = await rpc<{ incluidas: number; atualizadas: number; obras_novas: number }>("loc_importar", {
        p_usuario_nome: usuario,
        p_arquivo: arquivo,
        p_linhas: ok.map((l) => l.envio),
      });
      await recarregar();
      aviso(`${r.incluidas} incluídas e ${r.atualizadas} atualizadas` + (r.obras_novas ? ` · ${r.obras_novas} obras novas` : "") + ".");
      fechar();
    } catch (e) {
      setMsg("Nada foi gravado. " + (e as Error).message);
    } finally {
      setGravando(false);
    }
  }

  const ok = linhas.filter((l) => !l.erros.length);
  const ordenadas = [...linhas].sort((a, b) => Number(b.erros.length > 0) - Number(a.erros.length > 0));

  return (
    <Drawer aberto={importAberto} largo onFechar={fechar} rotulo="Importar ou exportar planilha">
      <div className="dhead">
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          <span className="tag" style={{ alignSelf: "flex-start" }}>
            Importação em lote
          </span>
          <h2>Importar ou exportar planilha</h2>
          <span className="sub">
            Preencha muitas locações no Excel e traga tudo de uma vez. Serve para Locações e Imóveis no mesmo arquivo.
          </span>
        </div>
        <button className="btn small" onClick={fechar}>
          Fechar
        </button>
      </div>
      <div className="steps">
        <div className="step">
          <span>
            <b className="n">1</b> Baixe o modelo
          </span>
          <span className="muted">Arquivo Excel com as abas Instruções, Locações, Imóveis e Listas.</span>
          <div className="btnrow">
            <button className="btn primary" onClick={() => gerar(() => baixarModelo(d), "Modelo baixado. Preencha no Excel e volte aqui para importar.")}>
              Baixar modelo (.xlsx)
            </button>
            <button className="btn" onClick={() => gerar(() => exportarDadosAtuais(d), "Exportação baixada.")}>
              Exportar dados atuais
            </button>
          </div>
          <span className="muted">
            A exportação já vem com o Código de cada item: edite e importe de volta para atualizar em massa. Ela inclui CPF/CNPJ, e-mail
            e telefone dos locadores; guarde o arquivo com cuidado.
          </span>
        </div>
        <div className="step">
          <span>
            <b className="n">2</b> Preencha e importe
          </span>
          <span className="muted">Escolha o arquivo preenchido. Você vê uma prévia com os erros antes de gravar.</span>
          <input
            type="file"
            accept=".xlsx"
            aria-label="Arquivo da planilha"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) ler(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>
      <p className="muted" style={{ margin: 0 }} role="status">
        {msg}
      </p>
      {linhas.length > 0 && (
        <div className="panel">
          <div className="bar">
            <h3>Prévia</h3>
            {ok.length > 0 && (
              <button className="btn primary" onClick={importar} disabled={gravando}>
                {gravando ? "Gravando…" : `Importar ${ok.length} linha${ok.length > 1 ? "s" : ""} válida${ok.length > 1 ? "s" : ""}`}
              </button>
            )}
          </div>
          {linhas.length > ok.length && (
            <p className="muted" style={{ margin: 0 }}>
              Linhas com erro ficam de fora. Corrija essas linhas no Excel e importe só elas de novo.
            </p>
          )}
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Aba</th>
                  <th className="num">Linha</th>
                  <th>Descrição</th>
                  <th>Obra</th>
                  <th>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {ordenadas.map((l) => (
                  <tr key={l.aba + l.linha}>
                    <td>{l.aba}</td>
                    <td className="num">{l.linha}</td>
                    <td>
                      <b>{l.descricao || "—"}</b>
                    </td>
                    <td>{l.obra || "—"}</td>
                    <td>
                      {l.erros.length ? (
                        <span className="err">{l.erros.join(" · ")}</span>
                      ) : l.codigo ? (
                        <Chip st="aditamento">Atualiza código {l.codigo}</Chip>
                      ) : (
                        <Chip st="ok">Nova</Chip>
                      )}
                      {l.avisos.length > 0 && <span className="note">{l.avisos.join(" · ")}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Drawer>
  );
}
