-- ============================================================
-- 0045: apagar membro nao pode levar o pagamento junto.
-- ============================================================
-- A regra era CASCADE: sair do grupo apagava o que a pessoa ja tinha pago, e o
-- caixa encolhia sem ninguem perceber. Dinheiro que entrou e fato consumado do
-- grupo, nao propriedade de quem saiu.
--
-- RESTRICT e a trava de verdade: vale para qualquer caminho, inclusive script
-- ou tela nova. A tela passa a ARQUIVAR (status = 'inactive') quem tem
-- historico, em vez de apagar.

alter table public.payments
  drop constraint if exists payments_member_id_fkey;

alter table public.payments
  add constraint payments_member_id_fkey
  foreign key (member_id) references public.group_members (id)
  on delete restrict;
