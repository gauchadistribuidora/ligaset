-- ============================================================
-- 0032: churrasco do jogo. Quem não vai jogar também come, então
--       a marcação é independente da presença: dá para estar
--       fora da quadra e dentro da carne.
-- ============================================================

alter table public.tournaments
  add column if not exists has_churrasco boolean not null default false;

alter table public.attendance
  add column if not exists churrasco boolean not null default false;

-- Para existir linha de quem só vai ao churrasco, a resposta do jogo passa a
-- poder ficar em branco. Quem lê presença filtra por status = 'yes', então
-- branco simplesmente não conta.
alter table public.attendance alter column status drop not null;
alter table public.attendance drop constraint if exists attendance_status_check;
alter table public.attendance add constraint attendance_status_check
  check (status is null or status in ('yes', 'no'));

create or replace function public.public_set_churrasco(
  p_code text,
  p_member uuid,
  p_sim boolean
) returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  t record;
begin
  select tt.id, tt.group_id, tt.confirmations_open, tt.has_churrasco into t
  from public.tournaments tt
  where tt.confirm_code is not null and tt.confirm_code = p_code;

  if t.id is null then
    return json_build_object('error', 'Link inválido.');
  end if;
  if not t.confirmations_open then
    return json_build_object('error', 'A lista deste jogo está fechada.');
  end if;
  if not t.has_churrasco then
    return json_build_object('error', 'Este jogo não tem churrasco.');
  end if;

  if not exists (
    select 1 from public.group_members gm
    where gm.id = p_member and gm.group_id = t.group_id and gm.status = 'active'
  ) then
    return json_build_object('error', 'Atleta não é deste grupo.');
  end if;

  insert into public.attendance (group_id, tournament_id, member_id, churrasco, updated_at)
  values (t.group_id, t.id, p_member, coalesce(p_sim, false), now())
  on conflict (tournament_id, member_id)
  do update set churrasco = coalesce(p_sim, false), updated_at = now();

  return json_build_object('ok', true);
end;
$$;

-- Alguém que não é do grupo e foi só para o churrasco.
create or replace function public.public_add_churrasco_guest(
  p_code text,
  p_nome text
) returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  t record;
  nome text;
  novo uuid;
begin
  select tt.id, tt.group_id, tt.confirmations_open, tt.has_churrasco into t
  from public.tournaments tt
  where tt.confirm_code is not null and tt.confirm_code = p_code;

  if t.id is null then
    return json_build_object('error', 'Link inválido.');
  end if;
  if not t.confirmations_open then
    return json_build_object('error', 'A lista deste jogo está fechada.');
  end if;
  if not t.has_churrasco then
    return json_build_object('error', 'Este jogo não tem churrasco.');
  end if;

  nome := nullif(btrim(coalesce(p_nome, '')), '');
  if nome is null or length(nome) < 2 then
    return json_build_object('error', 'Escreva o nome do convidado.');
  end if;
  if length(nome) > 60 then
    return json_build_object('error', 'Nome muito longo.');
  end if;

  insert into public.group_members (group_id, name, role, status, is_guest)
  values (t.group_id, nome, 'player', 'active', true)
  returning id into novo;

  -- Sem resposta no jogo: veio só para a carne, então não entra no sorteio.
  insert into public.attendance (group_id, tournament_id, member_id, churrasco, updated_at)
  values (t.group_id, t.id, novo, true, now());

  return json_build_object('ok', true, 'id', novo, 'nome', nome);
end;
$$;

grant execute on function public.public_set_churrasco(text, uuid, boolean) to anon, authenticated;
grant execute on function public.public_add_churrasco_guest(text, text) to anon, authenticated;

-- A lista pública passa a devolver o churrasco do jogo e de cada um.
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
         tt.has_churrasco,
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
    select gm.id, gm.name, gm.is_guest, a.status, a.updated_at,
           coalesce(a.churrasco, false) as churrasco,
           a.partner_member_id as partner_id,
           p.name as partner_name
    from public.group_members gm
    left join public.attendance a
      on a.member_id = gm.id and a.tournament_id = t.id
    left join public.group_members p on p.id = a.partner_member_id
    where gm.group_id = t.group_id and gm.status = 'active'
  ) x;

  return json_build_object(
    'tournament', json_build_object('name', t.name, 'date', t.date, 'group', t.group_name),
    'capacity', cap,
    'churrasco', t.has_churrasco,
    'members', membros
  );
end;
$$;

grant execute on function public.public_attendance_list(text) to anon, authenticated;
