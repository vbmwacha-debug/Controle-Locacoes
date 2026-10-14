-- =====================================================================
-- Controle de Locações Ultra — REMOVER OS DADOS DE EXEMPLO
-- Apaga as obras com "(exemplo)" no nome, os itens delas, o histórico ligado a elas
-- e o usuário "Exemplo Sistema". Não toca em nenhum outro dado.
-- O histórico é imutável; este script desliga a trava só durante a limpeza e religa no fim.
-- =====================================================================

begin;

create temp table loc_tmp_obras on commit drop as
  select id from loc_obras where nome like '%(exemplo)';
create temp table loc_tmp_itens on commit drop as
  select id from loc_locacoes where obra_id in (select id from loc_tmp_obras);

alter table loc_historico disable trigger loc_historico_imutavel;

delete from loc_historico
where usuario_nome = 'Exemplo Sistema'
   or locacao_id in (select id from loc_tmp_itens)
   or obra_id in (select id from loc_tmp_obras);

alter table loc_historico enable trigger loc_historico_imutavel;

delete from loc_imovel_detalhes where locacao_id in (select id from loc_tmp_itens);
delete from loc_locacoes where id in (select id from loc_tmp_itens);
delete from loc_obras where id in (select id from loc_tmp_obras);
delete from loc_usuarios where nome = 'Exemplo Sistema';

commit;

-- Confira: deve mostrar 0 e 0
select (select count(*) from loc_obras where nome like '%(exemplo)') as obras_exemplo,
       (select count(*) from loc_historico where usuario_nome = 'Exemplo Sistema') as historico_exemplo;
