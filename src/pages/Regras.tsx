import { Fragment } from "react";
import { Chip } from "../components/comum";
import { ANTECEDENCIA, type StatusKey } from "../lib/calc";

const REGRAS: [StatusKey, string, string][] = [
  ["vencido", "Hoje passou do fim contratual e o item não foi devolvido", "Aditar ou devolver no mesmo dia. É o caso que trava o pagamento no Financeiro."],
  ["contratacao", "Imóvel com fase Mobilizar: contrato ainda não assinado", "Concluir contrato e FOC antes de ocupar."],
  ["aditar", `Faltam até ${ANTECEDENCIA} dias para o fim contratual e a obra ainda precisa do item`, "Acionar Suprimentos e registrar a solicitação."],
  ["atrasada", "A previsão de saída já passou e o item continua na obra", "Devolver ou corrigir a previsão (e checar se precisa aditar)."],
  ["aditamento", "Aditivo solicitado (ou imóvel com fase Tramitando) e ainda dentro do contrato", "Acompanhar com Suprimentos até a nova FOC."],
  ["programar", "Saída prevista nos próximos 15 dias, dentro do contrato. Imóveis: 15 dias + o aviso prévio, ou fase Desmobilizar", "Agendar retirada. Imóvel: avisar o locador até a data indicada e agendar vistoria."],
  ["atencao", "Faltam 31 a 60 dias para o fim contratual", "Confirmar se devolve ou adita."],
  ["prever", "Previsão de saída passa do fim contratual, mas ainda há tempo", `Pedir aditivo até ${ANTECEDENCIA} dias antes do fim.`],
  ["ok", "Dentro do prazo", "Nada."],
  ["encerrado", "Data de devolução preenchida (imóvel: fase Desmobilizado ou Encerrado)", "Conferir a última medição e a devolução da caução."],
];

export default function Regras() {
  return (
    <section className="view">
      <div className="panel">
        <h2>Como o status é calculado</h2>
        <p className="muted" style={{ margin: 0 }}>
          O sistema compara três datas: hoje, o <b>fim contratual</b> (chegada + prazo da FOC) e a <b>previsão de saída</b> informada
          pelo gestor. A antecedência para aditar é de {ANTECEDENCIA} dias; ajuste ao tempo real que Suprimentos leva. A regra é
          avaliada na ordem abaixo: o primeiro status que se aplica vence.
        </p>
        <div className="rules">
          <div className="h">Status</div>
          <div className="h">Quando aparece</div>
          <div className="h">O que o gestor faz</div>
          {REGRAS.map(([s, q, a]) => (
            <Fragment key={s}>
              <div>
                <Chip st={s} />
              </div>
              <div>{q}</div>
              <div>{a}</div>
            </Fragment>
          ))}
        </div>
      </div>
      <div className="panel">
        <h2>Campos do lançamento</h2>
        <ul className="fields">
          <li><b>Obra</b> (com diretoria e gestor responsável, cadastrados na aba Obras): dono de cada item e base do painel por diretoria</li>
          <li><b>Categoria</b>: lista com 25 sugestões; em "Outro (escrever)" o gestor digita uma nova, que fica gravada na lista para todos</li>
          <li><b>Descrição, fornecedor, FOC, FTC, quantidade</b>: como na planilha atual</li>
          <li><b>Valor unitário e unidade</b>: mês, semana ou dia</li>
          <li><b>Prazo contratado</b>: o prazo da FOC</li>
          <li><b>Data de chegada</b>: início da locação</li>
          <li><b>Fim contratual ƒ</b>: chegada + prazo. É a data que trava o pagamento se passar</li>
          <li><b>Previsão de saída</b>: até quando a obra precisa do item</li>
          <li><b>Aditivo e data da solicitação</b>: registro de que Suprimentos foi acionado</li>
          <li><b>Data de devolução</b>: encerra o item e congela o cálculo</li>
          <li><b>Valor total FOC ƒ</b>: qtd × valor × prazo</li>
          <li><b>Períodos usados ƒ</b>: calculado até hoje, não digitado</li>
          <li><b>Saldo ƒ</b>: total FOC − consumo até hoje</li>
          <li><b>Custo mensal ƒ</b>: qtd × valor convertido para mês (semana × 4,345; dia × 30,4375); imóvel: aluguel + encargos pagos pela Ultra</li>
          <li><b>Status ƒ</b>: automático, pelas regras acima</li>
          <li><b>Imóveis</b> (categoria Imóvel): término do contrato no lugar do prazo, fase, tipo de uso, locador (PF/PJ, CPF/CNPJ, contato), endereço, capacidade, alojados, IPTU, condomínio, água, energia e internet (quem paga e valor), itens inclusos, dia de vencimento, situação do pagamento, pendências, reajuste, garantia, aviso prévio, rescisão e multa</li>
          <li><b>Usuário e histórico</b>: cada pessoa entra digitando nome e sobrenome, sem senha; o nome aparece no topo e toda inclusão, edição, aditivo, devolução, importação e categoria nova fica registrada na aba Histórico, com data, hora e o que mudou</li>
          <li><b>Importação em lote</b>: baixar o modelo Excel (abas Locações e Imóveis), preencher várias linhas e importar de uma vez, com prévia e erros por linha antes de gravar. Exportar gera o mesmo formato com o Código de cada item, para atualizar em massa</li>
          <li><b>Próximo reajuste ƒ</b> e <b>Avisar locador até ƒ</b>: calculados pelo aniversário do contrato e pelo aviso prévio</li>
          <li><b>Dados pessoais do locador</b> (CPF/CNPJ, e-mail, telefone): aparecem só na ficha do imóvel e na exportação de imóveis</li>
        </ul>
      </div>
    </section>
  );
}
