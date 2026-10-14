-- =====================================================================
-- Controle de Locações Ultra — REMOVER OS DADOS DE EXEMPLO
-- Apaga as obras com "(exemplo)" no nome, os itens delas, o histórico ligado a elas
-- e o usuário "Exemplo Sistema". Não toca em nenhum outro dado.
-- O histórico é imutável; a trava é desligada só durante a limpeza e religada no fim.
-- Tudo roda num bloco único: ou apaga tudo, ou não apaga nada.
-- =====================================================================

do $$
begin
  alter table loc_historico disable trigger loc_historico_imutavel;

  delete from loc_historico
  where usuario_nome = 'Exemplo Sistema'
     or locacao_id in (select l.id from loc_locacoes l join loc_obras o on o.id = l.obra_id
                       where o.nome like '%(exemplo)')
     or obra_id in (select id from loc_obras where nome like '%(exemplo)');

  alter table loc_historico enable trigger loc_historico_imutavel;

  delete from loc_imovel_detalhes
  where locacao_id in (select l.id from loc_locacoes l join loc_obras o on o.id = l.obra_id
                       where o.nome like '%(exemplo)');
  delete from loc_locacoes where obra_id in (select id from loc_obras where nome like '%(exemplo)');
  delete from loc_obras where nome like '%(exemplo)';
  delete from loc_usuarios where nome = 'Exemplo Sistema';
end $$;

-- Confira: deve mostrar 0, 0 e "O" (trava do histórico ligada)
select (select count(*) from loc_obras where nome like '%(exemplo)') as obras_exemplo,
       (select count(*) from loc_historico where usuario_nome = 'Exemplo Sistema') as historico_exemplo,
       (select tgenabled from pg_trigger where tgname = 'loc_historico_imutavel') as trava_historico;
