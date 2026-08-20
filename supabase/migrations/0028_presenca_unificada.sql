-- ============================================================
-- 0028: confirmar presença passa a ser a mesma coisa que entrar
--       na lista do jogo. Eram duas listas separadas e o admin
--       tinha que repetir a seleção na mão.
-- ============================================================

alter table public.payments
  add column if not exists tournament_id uuid references public.tournaments (id) on delete set null;

create or replace function public.sync_attendance_players()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'DELETE') then
    delete from public.tournament_players
    where tournament_id = old.tournament_id and member_id = old.member_id;
    return old;
  end if;

  if new.status = 'yes' then
    insert into public.tournament_players (tournament_id, member_id)
    values (new.tournament_id, new.member_id)
    on conflict do nothing;
  else
    delete from public.tournament_players
    where tournament_id = new.tournament_id and member_id = new.member_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_attendance_players on public.attendance;
create trigger trg_sync_attendance_players
after insert or update or delete on public.attendance
for each row execute function public.sync_attendance_players();

-- A lista pública passa a usar as vagas do próprio jogo.
create or replace function public.public_attendance_list(p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  t record;
  membros json;
  cap int;
begin
  select tt.id, tt.name, tt.date, tt.group_id, tt.confirmations_open,
         coalesce(tt.capacity, gs.capacity) as vagas, g.name as group_name
    into t
  from public.tournaments tt
  join public.groups g on g.id = tt.group_id
  left join public.group_settings gs on gs.group_id = tt.group_id
  where tt.confirm_code is not null and tt.confirm_code = p_code;

  if t.id is null then
    return json_build_object('error', 'Link inválido.');
  end if;
  if not t.confirmations_open then
    return json_build_object('error', 'A lista de presença deste jogo está fechada.');
  end if;

  cap := t.vagas;

  select coalesce(json_agg(x order by x.name), '[]'::json) into membros
  from (
    select gm.id, gm.name, a.status, a.updated_at
    from public.group_members gm
    left join public.attendance a
      on a.member_id = gm.id and a.tournament_id = t.id
    where gm.group_id = t.group_id and gm.status = 'active'
  ) x;

  return json_build_object(
    'tournament', json_build_object('name', t.name, 'date', t.date, 'group', t.group_name),
    'capacity', cap,
    'members', membros
  );
end;
$$;

grant execute on function public.public_attendance_list(text) to anon, authenticated;
