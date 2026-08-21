-- ============================================================
-- 0030: no mesmo link da confirmação, cada um já diz com quem
--       vai jogar. A dupla é recíproca e exclusiva.
-- ============================================================

alter table public.attendance
  add column if not exists partner_member_id uuid references public.group_members (id) on delete set null;

-- Se A escolhe B, B fica com A, e ninguém mais pega os dois. Sem isso, três
-- pessoas apontam para a mesma e na quadra ninguém sabe quem joga com quem.
create or replace function public.public_set_partner(
  p_code text,
  p_member uuid,
  p_partner uuid
) returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  t record;
  atual uuid;
  ocupado uuid;
  nome_p text;
  nome_o text;
begin
  select tt.id, tt.group_id, tt.confirmations_open into t
  from public.tournaments tt
  where tt.confirm_code is not null and tt.confirm_code = p_code;

  if t.id is null then
    return json_build_object('error', 'Link inválido.');
  end if;
  if not t.confirmations_open then
    return json_build_object('error', 'A lista deste jogo está fechada.');
  end if;

  if not exists (
    select 1 from public.group_members gm
    where gm.id = p_member and gm.group_id = t.group_id and gm.status = 'active'
  ) then
    return json_build_object('error', 'Atleta não é deste grupo.');
  end if;

  -- Quem eu tinha antes? Se troquei de parceiro, o antigo fica livre.
  select a.partner_member_id into atual
  from public.attendance a
  where a.tournament_id = t.id and a.member_id = p_member;

  if atual is not null and atual is distinct from p_partner then
    update public.attendance set partner_member_id = null, updated_at = now()
    where tournament_id = t.id and member_id = atual;
  end if;

  if p_partner is null then
    update public.attendance set partner_member_id = null, updated_at = now()
    where tournament_id = t.id and member_id = p_member;
    return json_build_object('ok', true);
  end if;

  if p_partner = p_member then
    return json_build_object('error', 'Escolha outra pessoa.');
  end if;

  if not exists (
    select 1 from public.group_members gm
    where gm.id = p_partner and gm.group_id = t.group_id and gm.status = 'active'
  ) then
    return json_build_object('error', 'Atleta não é deste grupo.');
  end if;

  select a.partner_member_id into ocupado
  from public.attendance a
  where a.tournament_id = t.id and a.member_id = p_partner;

  if ocupado is not null and ocupado is distinct from p_member then
    select gm.name into nome_p from public.group_members gm where gm.id = p_partner;
    select gm.name into nome_o from public.group_members gm where gm.id = ocupado;
    return json_build_object(
      'error',
      coalesce(nome_p, 'Essa pessoa') || ' já está com ' || coalesce(nome_o, 'outro atleta') || '.'
    );
  end if;

  -- Formar dupla é confirmar presença dos dois.
  insert into public.attendance (group_id, tournament_id, member_id, status, partner_member_id, updated_at)
  values (t.group_id, t.id, p_member, 'yes', p_partner, now())
  on conflict (tournament_id, member_id)
  do update set status = 'yes', partner_member_id = p_partner, updated_at = now();

  insert into public.attendance (group_id, tournament_id, member_id, status, partner_member_id, updated_at)
  values (t.group_id, t.id, p_partner, 'yes', p_member, now())
  on conflict (tournament_id, member_id)
  do update set status = 'yes', partner_member_id = p_member, updated_at = now();

  return json_build_object('ok', true);
end;
$$;

grant execute on function public.public_set_partner(text, uuid, uuid) to anon, authenticated;

-- A lista pública passa a devolver a dupla de cada um.
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
    select gm.id, gm.name, a.status, a.updated_at,
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
    'members', membros
  );
end;
$$;

grant execute on function public.public_attendance_list(text) to anon, authenticated;
