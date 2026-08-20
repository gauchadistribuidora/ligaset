-- ============================================================
-- 0029: ao confirmar, o convidado já gera a cobrança da quadra.
--       Ela nasce PENDENTE: o dinheiro só é dado como recebido
--       quando o administrador confirmar o Pix.
-- ============================================================

CREATE OR REPLACE FUNCTION public.join_as_guest(p_code text, p_host uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  inv record;
  uid uuid := auth.uid();
  ja  record;
  prof record;
  mid uuid;
  anfitriao uuid;
  valor numeric;
  quando date;
begin
  if uid is null then
    return json_build_object('error', 'Faça login para confirmar.');
  end if;

  select gi.group_id, gi.tournament_id, gi.invited_by,
         gs.guest_fee, t.date as data
    into inv
  from public.guest_invites gi
  left join public.group_settings gs on gs.group_id = gi.group_id
  left join public.tournaments t on t.id = gi.tournament_id
  where gi.code = p_code;

  if inv.group_id is null then
    return json_build_object('error', 'Convite inválido ou expirado.');
  end if;

  if p_host is not null and exists (
    select 1 from public.group_members gm
    where gm.id = p_host and gm.group_id = inv.group_id
  ) then
    anfitriao := p_host;
  else
    anfitriao := inv.invited_by;
  end if;

  select id, is_guest into ja
  from public.group_members
  where group_id = inv.group_id and user_id = uid;

  if ja.id is not null then
    mid := ja.id;
    if ja.is_guest and anfitriao is not null then
      update public.group_members set invited_by = anfitriao where id = mid;
    end if;
  else
    select full_name, email into prof from public.profiles where id = uid;
    insert into public.group_members (group_id, user_id, name, email, role, status, is_guest, invited_by)
    values (
      inv.group_id, uid,
      coalesce(nullif(trim(prof.full_name), ''), split_part(coalesce(prof.email,'convidado'), '@', 1)),
      prof.email, 'player', 'active', true, anfitriao
    )
    returning id into mid;
  end if;

  if inv.tournament_id is not null then
    insert into public.attendance (group_id, tournament_id, member_id, status, updated_at)
    values (inv.group_id, inv.tournament_id, mid, 'yes', now())
    on conflict (tournament_id, member_id)
    do update set status = 'yes', updated_at = now();
  end if;

  -- Cobrança da quadra: só para quem é convidado, só com valor definido e
  -- uma por jogo.
  valor := coalesce(inv.guest_fee, 0);
  quando := coalesce(inv.data, current_date);

  if valor > 0
     and inv.tournament_id is not null
     and coalesce((select gm.is_guest from public.group_members gm where gm.id = mid), false)
     and not exists (
       select 1 from public.payments p
       where p.member_id = mid and p.tournament_id = inv.tournament_id
     )
  then
    insert into public.payments (group_id, member_id, amount, reference_month, due_date, status, tournament_id)
    values (inv.group_id, mid, valor, date_trunc('month', quando)::date, quando, 'pending', inv.tournament_id);
  end if;

  return json_build_object('ok', true, 'group_id', inv.group_id);
end;
$function$;

revoke execute on function public.join_as_guest(text, uuid) from public, anon;
grant  execute on function public.join_as_guest(text, uuid) to authenticated;
