-- ============================================================
-- 0023: todo membro do grupo acompanha o financeiro.
--       Antes o jogador só enxergava as próprias mensalidades,
--       então não dava para acompanhar caixa, despesas e saldo.
--       Escrever continua exclusivo do administrador.
-- ============================================================

drop policy if exists "payments_select" on public.payments;
create policy "payments_select" on public.payments
  for select to authenticated
  using (public.is_group_member(group_id));
