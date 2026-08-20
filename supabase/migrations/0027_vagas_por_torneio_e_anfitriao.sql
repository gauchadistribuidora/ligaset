-- ============================================================
-- 0027: vagas definidas no próprio torneio, e o convite passa a
--       ser do jogo (um link só) com o convidado dizendo quem o
--       chamou.
-- ============================================================

alter table public.tournaments
  add column if not exists capacity int;

alter table public.group_members
  add column if not exists invited_by uuid references public.group_members (id) on delete set null;

-- Além do jogo e do Pix, a página do convite passa a mostrar quantos já
-- confirmaram e quantas vagas restam, e a lista de atletas para o convidado
-- escolher quem o chamou. Continua devolvendo só id e nome.
create or replace function public.public_invite_info(p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  inv record;
  atletas json;
  confirmados int;
begin
  select gi.id, gi.group_id, gi.tournament_id,
         g.name as grupo,
         gm.name as convidou,
         gs.pix_key, gs.guest_fee,
         coalesce(t.capacity, gs.capacity) as vagas,
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

  select coalesce(json_agg(json_build_object('id', x.id, 'name', x.name) order by x.name), '[]'::json)
    into atletas
  from (
    select gm2.id, gm2.name from public.group_members gm2
    where gm2.group_id = inv.group_id and gm2.status = 'active' and not gm2.is_guest
  ) x;

  select count(*) into confirmados
  from public.attendance a
  where a.tournament_id = inv.tournament_id and a.status = 'yes';

  return json_build_object(
    'grupo', inv.grupo,
    'convidou', inv.convidou,
    'torneio', inv.torneio,
    'data', inv.data,
    'local', inv.local,
    'quadras', inv.quadras,
    'pix', inv.pix_key,
    'valor', inv.guest_fee,
    'vagas', inv.vagas,
    'confirmados', coalesce(confirmados, 0),
    'atletas', atletas
  );
end;
$$;

-- Passa a receber quem convidou. O anfitrião informado tem que ser do mesmo
-- grupo, senão cai no criador do link.
drop function if exists public.join_as_guest(text);

create or replace function public.join_as_guest(p_code text, p_host uuid default null)
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
  anfitriao uuid;
begin
  if uid is null then
    return json_build_object('error', 'Faça login para confirmar.');
  end if;

  select gi.group_id, gi.tournament_id, gi.invited_by into inv
  from public.guest_invites gi where gi.code = p_code;

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

  return json_build_object('ok', true, 'group_id', inv.group_id);
end;
$$;

grant execute on function public.public_invite_info(text) to anon, authenticated;
revoke execute on function public.join_as_guest(text, uuid) from public, anon;
grant execute on function public.join_as_guest(text, uuid) to authenticated;
