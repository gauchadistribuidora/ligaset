-- ============================================================
-- 0026: fecha a permissão das funções que exigem login.
--       Revogar de "anon" não bastava: no Postgres a função nasce
--       com EXECUTE para PUBLIC, e o anon herda daí. As funções já
--       se defendiam checando auth.uid(), mas a permissão precisa
--       dizer a mesma coisa.
-- ============================================================

revoke execute on function public.join_as_guest(text) from public, anon;
grant  execute on function public.join_as_guest(text) to authenticated;

revoke execute on function public.join_group_by_code(text) from public, anon;
grant  execute on function public.join_group_by_code(text) to authenticated;

revoke execute on function public.can_manage_pneu(uuid) from public, anon;
grant  execute on function public.can_manage_pneu(uuid) to authenticated;
