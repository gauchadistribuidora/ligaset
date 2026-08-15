-- ============================================================
-- 0021: confirmação sem app, troféu da temporada do pneu e
--       lotação da quadra (para a lista de espera).
-- ============================================================

alter table public.tournaments
  add column if not exists confirm_code text unique;

-- Quantas vagas a quadra comporta. Acima disso a confirmação vira espera.
alter table public.group_settings
  add column if not exists capacity int;

-- ---------- troféu da temporada do pneu ----------
create table if not exists public.pneu_seasons (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups (id) on delete cascade,
  label      text not null,
  member_id  uuid references public.group_members (id) on delete set null,
  total      int  not null default 0,
  closed_on  date not null default current_date,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index if not exists idx_pneu_seasons_group
  on public.pneu_seasons (group_id, closed_on desc);

alter table public.pneu_seasons enable row level security;

drop policy if exists "pneu_seasons_select" on public.pneu_seasons;
create policy "pneu_seasons_select" on public.pneu_seasons
  for select to authenticated using (public.is_group_member(group_id));

drop policy if exists "pneu_seasons_write" on public.pneu_seasons;
create policy "pneu_seasons_write" on public.pneu_seasons
  for all to authenticated
  using (public.is_group_admin(group_id))
  with check (public.is_group_admin(group_id));

-- ---------- confirmação sem app ----------
-- Duas funções abertas ao público, para quem nunca instalou o app confirmar
-- pelo link. Elas só funcionam com o código certo E com a lista aberta, e
-- devolvem apenas nome e resposta — nunca e-mail ou telefone.
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
  select tt.id, tt.name, tt.date, tt.group_id, tt.confirmations_open, g.name as group_name
    into t
  from public.tournaments tt
  join public.groups g on g.id = tt.group_id
  where tt.confirm_code is not null and tt.confirm_code = p_code;

  if t.id is null then
    return json_build_object('error', 'Link inválido.');
  end if;
  if not t.confirmations_open then
    return json_build_object('error', 'A lista de presença deste jogo está fechada.');
  end if;

  select gs.capacity into cap
  from public.group_settings gs where gs.group_id = t.group_id;

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

create or replace function public.public_attendance_set(
  p_code text,
  p_member uuid,
  p_status text
) returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  t record;
begin
  if p_status not in ('yes', 'no') then
    return json_build_object('error', 'Resposta inválida.');
  end if;

  select tt.id, tt.group_id, tt.confirmations_open into t
  from public.tournaments tt
  where tt.confirm_code is not null and tt.confirm_code = p_code;

  if t.id is null then
    return json_build_object('error', 'Link inválido.');
  end if;
  if not t.confirmations_open then
    return json_build_object('error', 'A lista de presença deste jogo está fechada.');
  end if;

  -- O atleta tem que ser do mesmo grupo do torneio.
  if not exists (
    select 1 from public.group_members gm
    where gm.id = p_member and gm.group_id = t.group_id and gm.status = 'active'
  ) then
    return json_build_object('error', 'Atleta não encontrado neste grupo.');
  end if;

  insert into public.attendance (group_id, tournament_id, member_id, status, updated_at)
  values (t.group_id, t.id, p_member, p_status, now())
  on conflict (tournament_id, member_id)
  do update set status = excluded.status, updated_at = now();

  return json_build_object('ok', true);
end;
$$;

grant execute on function public.public_attendance_list(text) to anon, authenticated;
grant execute on function public.public_attendance_set(text, uuid, text) to anon, authenticated;
