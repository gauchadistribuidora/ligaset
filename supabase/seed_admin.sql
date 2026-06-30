-- ============================================================
-- Ligaset — Seed do administrador/proprietário
-- Henrique Nunes <gauchadistribuidora@gmail.com>
--
-- COMO USAR:
-- 1) Suba o app e faça login UMA vez com gauchadistribuidora@gmail.com
--    (o trigger handle_new_user cria automaticamente o seu profile).
-- 2) Rode este script no SQL Editor do Supabase.
--    Ele define seu nome e cria o grupo principal com você como dono/admin.
-- ============================================================

do $$
declare
  uid uuid;
begin
  select id into uid
  from public.profiles
  where email ilike 'gauchadistribuidora@gmail.com'
  limit 1;

  if uid is null then
    raise notice 'Henrique ainda não fez o primeiro login. Faça login e rode novamente.';
    return;
  end if;

  -- garante o nome do proprietário
  update public.profiles
  set full_name = 'Henrique Nunes'
  where id = uid;

  -- cria o grupo principal (apenas se ele ainda não tiver nenhum grupo próprio)
  if not exists (select 1 from public.groups where owner_id = uid) then
    insert into public.groups (name, description, color, owner_id)
    values ('Ligaset', 'Grupo principal', '#10b981', uid);
    -- o trigger handle_new_group adiciona o Henrique como membro 'owner'
    -- e cria a linha em group_settings automaticamente.
    raise notice 'Grupo Ligaset criado e Henrique definido como proprietário/admin.';
  else
    raise notice 'Henrique já possui grupo(s); nome atualizado.';
  end if;
end $$;
