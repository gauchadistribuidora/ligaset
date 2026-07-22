-- ============================================================
-- 0012: admin da plataforma pode editar qualquer perfil
-- (profiles_select já é aberto para autenticados, então a
--  listagem já funciona; aqui liberamos o UPDATE p/ o admin)
-- ============================================================
drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update" on public.profiles
  for update to authenticated
  using ((auth.jwt() ->> 'email') = 'gauchadistribuidora@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'gauchadistribuidora@gmail.com');
