-- ============================================================
-- 0025: funções do convite de amigo.
--       A página do convite é aberta (o amigo ainda não tem conta),
--       então devolve só o necessário: jogo, horário, quadra e Pix.
--       Nunca e-mail ou telefone de ninguém.
-- ============================================================

create or replace function public.public_invite_info(p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  inv record;
begin
  select gi.id, gi.group_id, gi.tournament_id,
         g.name as grupo,
         gm.name as convidou,
         gs.pix_key, gs.guest_fee,
         t.name as torneio, t.date as data, t.location as local, t.courts as quadras
    into inv
  from public.guest_invites gi
  join public.groups g on g.id = gi.group_id
  left join public.group_members gm on gm.id = gi.invited_by
  left join public.group_settings gs on gs.group_id = gi.group_id
  left join public.tournaments t on t.id = gi.tournament_id
  where gi.code = p_code;

  if inv.id is null then
    return json_build_object('error', 'Convite inválido ou expirado.');
  end if;

  return json_build_object(
    'grupo', inv.grupo,
    'convidou', inv.convidou,
    'torneio', inv.torneio,
    'data', inv.data,
    'local', inv.local,
    'quadras', inv.quadras,
    'pix', inv.pix_key,
    'valor', inv.guest_fee
  );
end;
$$;

-- Entrar como convidado. Exige login; entra como convidado, nunca como membro,
-- e quem já é do grupo não é rebaixado.
create or replace function public.join_as_guest(p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  inv record;
  uid uuid := auth.uid();
  ja  record;
  prof record;
  mid uuid;
begin
  if uid is null then
    return json_build_object('error', 'Faça login para confirmar.');
  end if;

  select gi.group_id, gi.tournament_id into inv
  from public.guest_invites gi where gi.code = p_code;

  if inv.group_id is null then
    return json_build_object('error', 'Convite inválido ou expirado.');
  end if;

  select id, is_guest into ja
  from public.group_members
  where group_id = inv.group_id and user_id = uid;

  if ja.id is not null then
    mid := ja.id;
  else
    select full_name, email into prof from public.profiles where id = uid;
    insert into public.group_members (group_id, user_id, name, email, role, status, is_guest)
    values (
      inv.group_id, uid,
      coalesce(nullif(trim(prof.full_name), ''), split_part(coalesce(prof.email,'convidado'), '@', 1)),
      prof.email, 'player', 'active', true
    )
    returning id into mid;
  end if;

  if inv.tournament_id is not null then
    insert into public.attendance (group_id, tournament_id, member_id, status, updated_at)
    values (inv.group_id, inv.tournament_id, mid, 'yes', now())
    on conflict (tournament_id, member_id)
    do update set status = 'yes', updated_at = now();
  end if;

  return json_build_object('ok', true, 'group_id', inv.group_id);
end;
$$;

grant execute on function public.public_invite_info(text) to anon, authenticated;
revoke execute on function public.join_as_guest(text) from anon;
grant execute on function public.join_as_guest(text) to authenticated;
