-- ============================================================
-- 0010: campos de perfil coletados no cadastro
-- Estado, Cidade e Esporte que a pessoa pratica.
-- ============================================================

alter table public.profiles add column if not exists state text;
alter table public.profiles add column if not exists city  text;
alter table public.profiles add column if not exists sport text;

-- Popular os novos campos a partir do metadata enviado no signUp.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url, phone, state, city, sport)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    new.email,
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'state',
    new.raw_user_meta_data->>'city',
    new.raw_user_meta_data->>'sport'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
