import type { Quem, StatusKey, Unidade } from "./calc";

export interface Diretoria {
  id: number;
  nome: string;
  ativo: boolean;
}

export interface Usuario {
  id: number;
  nome: string;
  diretoria_id: number | null;
  unido_a_id: number | null;
  criado_em: string;
  ultimo_acesso: string | null;
}

export interface Obra {
  id: number;
  nome: string;
  diretoria_id: number;
  gestor_nome: string | null;
  ativa: boolean;
  criado_em: string;
}

export interface Categoria {
  id: number;
  nome: string;
  sugerida: boolean;
  criado_por: string | null;
  criado_em: string;
}

/** Linha da view loc_locacoes_status. */
export interface LocStatus {
  id: number;
  obra_id: number;
  obra_nome: string;
  diretoria_id: number;
  diretoria_nome: string | null;
  gestor_nome: string | null;
  categoria_id: number | null;
  categoria_nome: string | null;
  e_imovel: boolean;
  descricao: string;
  fornecedor: string;
  foc: string | null;
  ftc: string | null;
  quantidade: number;
  valor_unitario: number;
  unidade: Unidade;
  prazo: number;
  data_chegada: string;
  previsao_saida: string | null;
  aditivo_status: string;
  aditivo_data: string | null;
  data_devolucao: string | null;
  observacoes: string | null;
  criado_por_nome: string;
  criado_em: string;
  atualizado_por_nome: string | null;
  atualizado_em: string | null;
  fase: string | null;
  tipo_uso: string | null;
  termino_contrato: string | null;
  situacao_pagamento: string | null;
  capacidade: number | null;
  cidade_uf: string | null;
  encargos_ultra: number;
  fim_contratual: string | null;
  prazo_calculado: number;
  periodos_usados: number;
  valor_total_foc: number;
  saldo: number;
  mensal_base: number;
  custo_mensal: number;
  dias_fim: number | null;
  dias_prev: number | null;
  status: StatusKey;
  status_label: string;
  status_ordem: number;
  nota: string;
  acao: string;
  avisar_locador_ate: string | null;
  proximo_reajuste: string | null;
  dias_reajuste: number | null;
}

/** Linha de loc_imovel_detalhes. */
export interface ImovelDetalhes {
  locacao_id: number;
  termino_contrato: string;
  fase: string;
  numero_cotacao: string | null;
  tipo_uso: string | null;
  endereco: string | null;
  cidade_uf: string | null;
  capacidade: number | null;
  alojados: string | null;
  locador_tipo: "PF" | "PJ" | null;
  locador_documento: string | null;
  locador_email: string | null;
  locador_telefone: string | null;
  iptu_quem: Quem;
  iptu_valor: number | null;
  condominio_quem: Quem;
  condominio_valor: number | null;
  agua_quem: Quem;
  agua_valor: number | null;
  energia_quem: Quem;
  energia_valor: number | null;
  internet_quem: Quem;
  internet_valor: number | null;
  outros_inclusos: string | null;
  dia_vencimento: number | null;
  situacao_pagamento: string | null;
  pendencias: string | null;
  indice_reajuste: string | null;
  garantia: string | null;
  valor_garantia: number | null;
  aviso_previo_dias: number | null;
  rescisao_sem_multa_apos_meses: number | null;
  multa_atraso: string | null;
}

export interface HistoricoLinha {
  id: number;
  em: string;
  acao: string;
  usuario_nome: string;
  usuario: string;
  locacao_id: number | null;
  item_descricao: string | null;
  item_fornecedor: string | null;
  e_imovel: boolean;
  obra_id: number | null;
  obra_nome: string | null;
  referencia: string | null;
  resumo: string | null;
}

export const TIPOS_USO = [
  "Alojamento operacional",
  "Alojamento administrativo",
  "Base operacional",
  "Almoxarifado",
  "Escritório",
  "Casa de gerente / coordenação",
  "Galpão",
  "Flat / pousada",
  "Outro",
];
export const FASES = ["Mobilizar", "Tramitando", "Ativo", "Desmobilizar", "Pendente / distrato", "Desmobilizado", "Encerrado"];
export const QUEM_LABEL: Record<Quem, string> = {
  ultra: "Ultra paga",
  incluso: "Incluso no aluguel",
  locador: "Locador paga",
  na: "Não se aplica",
};
export const INDICES = ["IGP-M", "IPCA", "INCC", "Sem reajuste"];
export const GARANTIAS = ["Caução", "Seguro fiança", "Fiador", "Sem garantia"];
export const PAGAMENTOS = ["Em dia", "Em atraso"];

export const ACOES: Record<string, { l: string; c: string }> = {
  entrou: { l: "Entrou no sistema", c: "entrou" },
  criou: { l: "Incluiu", c: "criou" },
  editou: { l: "Editou", c: "editou" },
  "solicitou aditivo": { l: "Solicitou aditivo", c: "aditivo" },
  devolveu: { l: "Registrou devolução", c: "devolveu" },
  importou: { l: "Importou planilha", c: "importou" },
  "criou categoria": { l: "Criou categoria", c: "categoria" },
  excluiu: { l: "Juntou / excluiu", c: "devolveu" },
};
