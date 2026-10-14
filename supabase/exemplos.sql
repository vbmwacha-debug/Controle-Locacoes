-- =====================================================================
-- Controle de Locações Ultra — DADOS DE EXEMPLO
-- Rodar no SQL Editor do Supabase (depois do schema.sql).
-- Cria 11 obras "(exemplo)" com equipamentos e imóveis em todos os status.
-- As datas são relativas ao dia em que o script roda.
-- Para apagar tudo depois: supabase/remover_exemplos.sql
-- =====================================================================

do $$
declare
  u constant text := 'Exemplo Sistema';
  h date := loc_hoje();
  o_alfa bigint; o_beta bigint; o_gama bigint; o_galpao bigint; o_pav bigint; o_lot bigint;
  o_para bigint; o_araxa bigint; o_ma bigint; o_pi bigint; o_ap bigint;
  im bigint := (select id from loc_categorias where nome = loc_cat_imovel());
begin
  if exists (select 1 from loc_obras where nome like '%(exemplo)') then
    raise exception 'Os exemplos já existem. Para recriar, rode antes o remover_exemplos.sql.';
  end if;

  -- obras
  o_alfa   := loc_salvar_obra(u, null, 'Residencial Alfa (exemplo)', (select id from loc_diretorias where nome = 'Victor'), 'Gestor exemplo 1');
  o_beta   := loc_salvar_obra(u, null, 'Ed. Comercial Beta (exemplo)', (select id from loc_diretorias where nome = 'Bruno'), 'Gestor exemplo 2');
  o_gama   := loc_salvar_obra(u, null, 'Residencial Gama (exemplo)', (select id from loc_diretorias where nome = 'Adriana'), 'Gestor exemplo 5');
  o_galpao := loc_salvar_obra(u, null, 'Galpão Industrial (exemplo)', (select id from loc_diretorias where nome = 'Wellington'), 'Gestor exemplo 3');
  o_pav    := loc_salvar_obra(u, null, 'Pavimentação Rodovia (exemplo)', (select id from loc_diretorias where nome = 'Cesar'), 'Gestor exemplo 4');
  o_lot    := loc_salvar_obra(u, null, 'Loteamento Delta (exemplo)', (select id from loc_diretorias where nome = 'Flavio'), 'Gestor exemplo 6');
  o_para   := loc_salvar_obra(u, null, 'Operação Pará (exemplo)', (select id from loc_diretorias where nome = 'Cesar'), 'Gestor exemplo 7');
  o_araxa  := loc_salvar_obra(u, null, 'Operação Araxá (exemplo)', (select id from loc_diretorias where nome = 'Bruno'), 'Gestor exemplo 8');
  o_ma     := loc_salvar_obra(u, null, 'Operação Maranhão (exemplo)', (select id from loc_diretorias where nome = 'Wellington'), 'Gestor exemplo 9');
  o_pi     := loc_salvar_obra(u, null, 'Operação Piauí (exemplo)', (select id from loc_diretorias where nome = 'Flavio'), 'Gestor exemplo 10');
  o_ap     := loc_salvar_obra(u, null, 'Operação Amapá (exemplo)', (select id from loc_diretorias where nome = 'Claudimar'), 'Gestor exemplo 11');

  -- equipamentos e veículos: (obra, categoria, descrição, fornecedor, FOC, FTC, qtd, valor, prazo em meses, chegada, previsão, extras)
  perform loc_salvar_locacao(u, x) from (values
    (jsonb_build_object('obra_id', o_alfa, 'categoria_id', (select id from loc_categorias where nome like 'Container%'),
      'descricao', 'Container vestiário 6,00x2,40m', 'fornecedor', 'Locadora exemplo A', 'foc', '23393', 'ftc', '268-26',
      'quantidade', 1, 'valor_unitario', 890, 'unidade', 'mes', 'prazo', 8, 'data_chegada', h - 126, 'previsao_saida', h + 114)),
    (jsonb_build_object('obra_id', o_alfa, 'categoria_id', (select id from loc_categorias where nome like 'Container%'),
      'descricao', 'Container almoxarifado', 'fornecedor', 'Locadora exemplo A', 'foc', '23393', 'ftc', '268-26',
      'quantidade', 1, 'valor_unitario', 600, 'unidade', 'mes', 'prazo', 8, 'data_chegada', h - 126, 'previsao_saida', h + 7)),
    (jsonb_build_object('obra_id', o_alfa, 'categoria_id', (select id from loc_categorias where nome like 'Container%'),
      'descricao', 'Container escritório', 'fornecedor', 'Locadora exemplo A', 'foc', '23393', 'ftc', '268-26',
      'quantidade', 1, 'valor_unitario', 1100, 'unidade', 'mes', 'prazo', 8, 'data_chegada', h - 126, 'previsao_saida', h - 71)),
    (jsonb_build_object('obra_id', o_beta, 'categoria_id', (select id from loc_categorias where nome = 'Plataforma elevatória e balancim'),
      'descricao', 'Plataforma elevatória articulada', 'fornecedor', 'Locadora exemplo B', 'foc', '23110', 'ftc', '201-26',
      'quantidade', 1, 'valor_unitario', 6500, 'unidade', 'mes', 'prazo', 5, 'data_chegada', h - 181, 'previsao_saida', h + 7)),
    (jsonb_build_object('obra_id', o_beta, 'categoria_id', (select id from loc_categorias where nome = 'Andaime'),
      'descricao', 'Andaime fachadeiro (m²)', 'fornecedor', 'Locadora exemplo C', 'foc', '22987', 'ftc', '188-26',
      'quantidade', 850, 'valor_unitario', 4.2, 'unidade', 'mes', 'prazo', 8, 'data_chegada', h - 230, 'previsao_saida', h + 68)),
    (jsonb_build_object('obra_id', o_gama, 'categoria_id', (select id from loc_categorias where nome = 'Elevador de obra / cremalheira'),
      'descricao', 'Elevador cremalheira', 'fornecedor', 'Locadora exemplo B', 'foc', '23054', 'ftc', '195-26',
      'quantidade', 1, 'valor_unitario', 7800, 'unidade', 'mes', 'prazo', 12, 'data_chegada', h - 165, 'previsao_saida', h + 153)),
    (jsonb_build_object('obra_id', o_galpao, 'categoria_id', (select id from loc_categorias where nome = 'Caminhão (munck, basculante, pipa)'),
      'descricao', 'Caminhão munck 12 t', 'fornecedor', 'Locadora exemplo D', 'foc', '23301', 'ftc', '255-26',
      'quantidade', 1, 'valor_unitario', 18500, 'unidade', 'mes', 'prazo', 3, 'data_chegada', h - 50, 'previsao_saida', h + 40)),
    (jsonb_build_object('obra_id', o_galpao, 'categoria_id', (select id from loc_categorias where nome = 'Gerador e energia'),
      'descricao', 'Gerador 150 kVA', 'fornecedor', 'Locadora exemplo E', 'foc', '23188', 'ftc', '230-26',
      'quantidade', 1, 'valor_unitario', 5200, 'unidade', 'mes', 'prazo', 6, 'data_chegada', h - 146, 'previsao_saida', h + 38)),
    (jsonb_build_object('obra_id', o_galpao, 'categoria_id', (select id from loc_categorias where nome = 'Máquina de terraplenagem'),
      'descricao', 'Retroescavadeira com operador', 'fornecedor', 'Locadora exemplo D', 'foc', '23340', 'ftc', '260-26',
      'quantidade', 1, 'valor_unitario', 21000, 'unidade', 'mes', 'prazo', 4, 'data_chegada', h - 73, 'previsao_saida', h + 138,
      'aditivo_status', 'solicitado', 'aditivo_data', h - 8, 'observacoes', 'Aditivo de 3 meses solicitado')),
    (jsonb_build_object('obra_id', o_pav, 'categoria_id', (select id from loc_categorias where nome = 'Equipamento de compactação'),
      'descricao', 'Rolo compactador liso', 'fornecedor', 'Locadora exemplo F', 'foc', '23201', 'ftc', '236-26',
      'quantidade', 1, 'valor_unitario', 14000, 'unidade', 'mes', 'prazo', 6, 'data_chegada', h - 60, 'previsao_saida', h + 200)),
    (jsonb_build_object('obra_id', o_pav, 'categoria_id', (select id from loc_categorias where nome = 'Caminhão (munck, basculante, pipa)'),
      'descricao', 'Caminhão pipa 10.000 L', 'fornecedor', 'Locadora exemplo F', 'foc', '22990', 'ftc', '190-26',
      'quantidade', 1, 'valor_unitario', 16000, 'unidade', 'mes', 'prazo', 6, 'data_chegada', h - 226, 'previsao_saida', h - 44,
      'data_devolucao', h - 46)),
    (jsonb_build_object('obra_id', o_pav, 'categoria_id', (select id from loc_categorias where nome = 'Máquina de terraplenagem'),
      'descricao', 'Escavadeira hidráulica 20 t', 'fornecedor', 'Locadora exemplo D', 'foc', '23170', 'ftc', '228-26',
      'quantidade', 1, 'valor_unitario', 26000, 'unidade', 'mes', 'prazo', 4, 'data_chegada', h - 110, 'previsao_saida', h + 17)),
    (jsonb_build_object('obra_id', o_lot, 'categoria_id', (select id from loc_categorias where nome = 'Veículo leve (carro, pick-up, van)'),
      'descricao', 'Pick-up 4x4', 'fornecedor', 'Locadora exemplo G', 'foc', '22850', 'ftc', '170-26',
      'quantidade', 2, 'valor_unitario', 4300, 'unidade', 'mes', 'prazo', 12, 'data_chegada', h - 276, 'previsao_saida', h + 168))
  ) t(x);

  -- imóveis (dados do locador são fictícios)
  perform loc_salvar_locacao(u, x) from (values
    (jsonb_build_object('obra_id', o_para, 'categoria_id', im, 'descricao', 'Base operacional e pátio — Castanhal/PA',
      'fornecedor', 'Imobiliária Exemplo Norte Ltda', 'foc', '23410', 'ftc', '383-25', 'valor_unitario', 50000,
      'data_chegada', h - 59, 'previsao_saida', ((h - 59) + interval '24 months')::date,
      'observacoes', 'Aluguel renegociado de R$ 52.000 para R$ 50.000.',
      'imovel', jsonb_build_object('termino_contrato', ((h - 59) + interval '24 months')::date, 'fase', 'Ativo',
        'numero_cotacao', '11729 / 24126', 'tipo_uso', 'Base operacional', 'locador_tipo', 'PJ',
        'locador_documento', '00.000.000/0001-00', 'locador_email', 'contato@exemplo.com.br', 'locador_telefone', '(91) 90000-0000',
        'endereco', 'Av. Exemplo, 1000', 'cidade_uf', 'Castanhal/PA', 'alojados', 'Base da equipe de manutenção',
        'iptu_quem', 'ultra', 'iptu_valor', 4296.93, 'condominio_quem', 'na', 'agua_quem', 'incluso',
        'energia_quem', 'ultra', 'energia_valor', 13871.6, 'internet_quem', 'ultra', 'internet_valor', 1500,
        'dia_vencimento', 5, 'situacao_pagamento', 'Em dia', 'indice_reajuste', 'IGP-M', 'garantia', 'Caução',
        'valor_garantia', 100000, 'aviso_previo_dias', 30, 'rescisao_sem_multa_apos_meses', 12, 'multa_atraso', '10% sobre o aluguel + juros'))),
    (jsonb_build_object('obra_id', o_para, 'categoria_id', im, 'descricao', 'Alojamento operacional (3 aptos) — Bragança/PA',
      'fornecedor', 'Exemplo Serviços e Gestão Ltda', 'foc', '23455', 'ftc', '027-26', 'valor_unitario', 9000,
      'data_chegada', h - 57, 'previsao_saida', h + 260, 'observacoes', 'Falta instalar as câmeras.',
      'imovel', jsonb_build_object('termino_contrato', ((h - 57) + interval '36 months')::date, 'fase', 'Ativo',
        'numero_cotacao', '21824', 'tipo_uso', 'Alojamento operacional', 'locador_tipo', 'PJ',
        'locador_documento', '00.000.000/0002-00', 'locador_email', 'locador2@exemplo.com.br', 'locador_telefone', '(91) 90000-0001',
        'endereco', 'Av. Exemplo, 197, aptos 03, 04 e 07', 'cidade_uf', 'Bragança/PA', 'capacidade', 10,
        'alojados', 'Equipe de linha viva (10 pessoas)', 'iptu_quem', 'locador', 'agua_quem', 'incluso',
        'energia_quem', 'ultra', 'energia_valor', 456.14, 'internet_quem', 'incluso', 'outros_inclusos', 'Auxiliar de serviços gerais',
        'dia_vencimento', 13, 'situacao_pagamento', 'Em dia', 'indice_reajuste', 'IGP-M', 'garantia', 'Caução',
        'valor_garantia', 18000, 'aviso_previo_dias', 30, 'rescisao_sem_multa_apos_meses', 12, 'multa_atraso', '10% + juros'))),
    (jsonb_build_object('obra_id', o_araxa, 'categoria_id', im, 'descricao', 'Alojamento administrativo — Araxá/MG',
      'fornecedor', 'Locador exemplo PF 1', 'foc', '23380', 'ftc', '301-26', 'valor_unitario', 3100,
      'data_chegada', h - 207, 'previsao_saida', h + 138,
      'imovel', jsonb_build_object('termino_contrato', ((h - 207) + interval '12 months')::date, 'fase', 'Ativo',
        'numero_cotacao', '22011', 'tipo_uso', 'Alojamento administrativo', 'locador_tipo', 'PF',
        'locador_documento', '000.000.000-00', 'locador_email', 'locador3@exemplo.com', 'locador_telefone', '(34) 90000-0002',
        'endereco', 'Rua Exemplo, 365, apto 03', 'cidade_uf', 'Araxá/MG', 'capacidade', 2, 'alojados', 'Coordenação administrativa',
        'iptu_quem', 'locador', 'condominio_quem', 'locador', 'agua_quem', 'locador', 'energia_quem', 'locador', 'internet_quem', 'locador',
        'dia_vencimento', 20, 'situacao_pagamento', 'Em atraso', 'pendencias', 'Aluguel do mês passado',
        'indice_reajuste', 'IGP-M', 'garantia', 'Sem garantia', 'aviso_previo_dias', 30, 'rescisao_sem_multa_apos_meses', 6,
        'multa_atraso', '1% + juros de 1% a.m.'))),
    (jsonb_build_object('obra_id', o_araxa, 'categoria_id', im, 'descricao', 'Alojamento operacional (5 aptos) — Araxá/MG',
      'fornecedor', 'Imobiliária Exemplo MG Ltda', 'foc', '22801', 'ftc', '118-25', 'valor_unitario', 4600,
      'data_chegada', h - 546, 'previsao_saida', h + 169,
      'imovel', jsonb_build_object('termino_contrato', h + 2, 'fase', 'Ativo',
        'numero_cotacao', '18877', 'tipo_uso', 'Alojamento operacional', 'locador_tipo', 'PJ',
        'locador_documento', '00.000.000/0003-00', 'locador_email', 'locacao@exemplo-mg.com.br', 'locador_telefone', '(34) 90000-0003',
        'endereco', 'Rua Exemplo, 490, aptos 02 a 06', 'cidade_uf', 'Araxá/MG', 'capacidade', 15, 'alojados', 'Equipe de montagem',
        'iptu_quem', 'incluso', 'agua_quem', 'incluso', 'energia_quem', 'incluso', 'internet_quem', 'ultra', 'internet_valor', 99.9,
        'dia_vencimento', 7, 'situacao_pagamento', 'Em atraso', 'pendencias', 'Aluguel do mês passado',
        'indice_reajuste', 'IGP-M', 'garantia', 'Caução', 'valor_garantia', 9200, 'aviso_previo_dias', 30,
        'rescisao_sem_multa_apos_meses', 12, 'multa_atraso', '10% + juros'))),
    (jsonb_build_object('obra_id', o_ma, 'categoria_id', im, 'descricao', 'Almoxarifado — Timon/MA',
      'fornecedor', 'Locador exemplo PF 2', 'foc', '22950', 'ftc', '334-26', 'valor_unitario', 955.8,
      'data_chegada', h - 516, 'previsao_saida', h + 23,
      'observacoes', 'Distrato pedido ao jurídico; desocupação e vistoria previstas.',
      'imovel', jsonb_build_object('termino_contrato', h + 213, 'fase', 'Desmobilizar',
        'numero_cotacao', '23516', 'tipo_uso', 'Almoxarifado', 'locador_tipo', 'PF',
        'locador_documento', '000.000.000-01', 'locador_telefone', '(86) 90000-0004',
        'endereco', 'Rua Exemplo, 1143', 'cidade_uf', 'Timon/MA', 'iptu_quem', 'locador',
        'agua_quem', 'ultra', 'agua_valor', 116.19, 'energia_quem', 'ultra', 'energia_valor', 166.33,
        'dia_vencimento', 15, 'situacao_pagamento', 'Em dia', 'indice_reajuste', 'IGP-M', 'garantia', 'Sem garantia',
        'aviso_previo_dias', 30, 'rescisao_sem_multa_apos_meses', 12))),
    (jsonb_build_object('obra_id', o_ma, 'categoria_id', im, 'descricao', 'Alojamento operacional — Pastos Bons/MA',
      'fornecedor', 'Locador exemplo PF 3', 'foc', '21900', 'ftc', '045-24', 'valor_unitario', 800,
      'data_chegada', h - 956, 'previsao_saida', h + 79, 'observacoes', 'Aditivo tramitando há mais de 30 dias.',
      'imovel', jsonb_build_object('termino_contrato', h - 226, 'fase', 'Tramitando',
        'numero_cotacao', '25170', 'tipo_uso', 'Alojamento operacional', 'locador_tipo', 'PF',
        'locador_documento', '000.000.000-02', 'locador_telefone', '(99) 90000-0005',
        'endereco', 'Povoado Exemplo, s/n', 'cidade_uf', 'Pastos Bons/MA', 'capacidade', 6, 'alojados', 'Equipe de campo (6 pessoas)',
        'iptu_quem', 'locador', 'agua_quem', 'ultra', 'agua_valor', 39.23, 'energia_quem', 'ultra', 'energia_valor', 333.08,
        'dia_vencimento', 1, 'situacao_pagamento', 'Em atraso', 'pendencias', 'Três aluguéis aguardando o aditivo',
        'indice_reajuste', 'IGP-M', 'garantia', 'Sem garantia', 'aviso_previo_dias', 30, 'rescisao_sem_multa_apos_meses', 12))),
    (jsonb_build_object('obra_id', o_pi, 'categoria_id', im, 'descricao', 'Casa da coordenação — Teresina/PI',
      'fornecedor', 'Locador exemplo PJ', 'foc', '21550', 'ftc', '990-23', 'valor_unitario', 1950,
      'data_chegada', h - 1075, 'previsao_saida', h + 80,
      'imovel', jsonb_build_object('termino_contrato', h + 80, 'fase', 'Ativo',
        'numero_cotacao', '26290', 'tipo_uso', 'Casa de gerente / coordenação', 'locador_tipo', 'PJ',
        'locador_documento', '00.000.000/0004-00', 'locador_telefone', '(86) 90000-0006',
        'endereco', 'Rua Exemplo, 2137, bloco 03, apto 102', 'cidade_uf', 'Teresina/PI', 'capacidade', 3,
        'alojados', 'Coordenação do contrato', 'iptu_quem', 'incluso', 'condominio_quem', 'ultra', 'condominio_valor', 420,
        'agua_quem', 'ultra', 'agua_valor', 79.06, 'energia_quem', 'ultra', 'energia_valor', 568.99,
        'internet_quem', 'ultra', 'internet_valor', 99.9, 'dia_vencimento', 10, 'situacao_pagamento', 'Em dia',
        'indice_reajuste', 'IGP-M', 'garantia', 'Seguro fiança', 'aviso_previo_dias', 30, 'rescisao_sem_multa_apos_meses', 12,
        'multa_atraso', '10% + juros'))),
    (jsonb_build_object('obra_id', o_ap, 'categoria_id', im, 'descricao', 'Alojamento operacional — Macapá/AP',
      'fornecedor', 'Locador exemplo PF 4', 'foc', '23150', 'ftc', '210-26', 'valor_unitario', 2320,
      'data_chegada', h - 161, 'previsao_saida', h + 23,
      'imovel', jsonb_build_object('termino_contrato', h + 23, 'fase', 'Ativo',
        'numero_cotacao', '19966', 'tipo_uso', 'Alojamento operacional', 'locador_tipo', 'PF',
        'locador_documento', '000.000.000-03', 'locador_telefone', '(96) 90000-0007',
        'endereco', 'Av. Exemplo, 1541', 'cidade_uf', 'Macapá/AP', 'capacidade', 6, 'alojados', 'Equipe de redes (6 pessoas)',
        'iptu_quem', 'locador', 'condominio_quem', 'ultra', 'condominio_valor', 350, 'agua_quem', 'ultra', 'agua_valor', 90,
        'energia_quem', 'ultra', 'energia_valor', 410, 'internet_quem', 'ultra', 'internet_valor', 120,
        'dia_vencimento', 5, 'situacao_pagamento', 'Em dia', 'indice_reajuste', 'IGP-M', 'garantia', 'Caução',
        'valor_garantia', 2320, 'aviso_previo_dias', 30, 'rescisao_sem_multa_apos_meses', 0))),
    (jsonb_build_object('obra_id', o_ap, 'categoria_id', im, 'descricao', 'Alojamento — Santana/AP',
      'fornecedor', 'Locador exemplo PF 5', 'valor_unitario', 1500,
      'data_chegada', h + 2, 'previsao_saida', h + 260, 'observacoes', 'Aguardando assinatura do contrato.',
      'imovel', jsonb_build_object('termino_contrato', ((h + 2) + interval '12 months')::date, 'fase', 'Mobilizar',
        'numero_cotacao', '25094', 'tipo_uso', 'Alojamento operacional', 'locador_tipo', 'PF',
        'locador_documento', '000.000.000-04', 'locador_telefone', '(96) 90000-0008',
        'endereco', 'Av. Exemplo, 1599', 'cidade_uf', 'Santana/AP', 'capacidade', 4,
        'iptu_quem', 'locador', 'agua_quem', 'ultra', 'agua_valor', 80, 'energia_quem', 'ultra', 'energia_valor', 250,
        'dia_vencimento', 15, 'situacao_pagamento', 'Em dia', 'indice_reajuste', 'IGP-M', 'garantia', 'Caução',
        'valor_garantia', 1500, 'aviso_previo_dias', 30, 'rescisao_sem_multa_apos_meses', 12)))
  ) t(x);
end $$;

-- Confira: deve listar os exemplos com status variados
select obra_nome, descricao, status_label, nota from loc_locacoes_status
where obra_nome like '%(exemplo)' order by status_ordem, obra_nome;
