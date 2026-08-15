-- ============================================================
-- 0020: link de convite do grupo.
--       O administrador copia o link e manda no WhatsApp; quem
--       abre entra no grupo sozinho.
-- ============================================================

alter table public.groups
  add column if not exists invite_code text unique;

-- Entrar pelo código. É SECURITY DEFINER porque quem ainda não é membro não
-- enxerga o grupo pelo RLS — mas a função só faz o que o convite autoriza:
-- exige login, exige código válido e entra sempre como jogador comum.
create or replace function public.join_group_by_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  g_id uuid;
  uid  uuid := auth.uid();
  ja   uuid;
  prof record;
begin
  if uid is null then
    raise exception 'Faça login para entrar no grupo.';
  end if;

  select id into g_id
  from public.groups
  where invite_code is not null and invite_code = p_code;

  if g_id is null then
    raise exception 'Convite inválido ou expirado.';
  end if;

  select id into ja
  from public.group_members
  where group_id = g_id and user_id = uid;

  if ja is not null then
    return g_id; -- já é do grupo, só volta o id
  end if;

  select full_name, email into prof from public.profiles where id = uid;

  insert into public.group_members (group_id, user_id, name, email, role, status)
  values (
    g_id,
    uid,
    coalesce(nullif(trim(prof.full_name), ''), split_part(coalesce(prof.email, 'jogador'), '@', 1)),
    prof.email,
    'player',
    'active'
  );

  return g_id;
end;
$$;

-- Sem login não há nada a fazer aqui.
revoke execute on function public.join_group_by_code(text) from anon;
grant execute on function public.join_group_by_code(text) to authenticated;
