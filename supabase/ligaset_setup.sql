-- ============================================================
-- Ligaset — setup completo do banco (cole tudo no SQL Editor)
-- Projeto Supabase: izjrqunvwxhaspbxjsht
-- Ordem: tabelas -> funções/triggers/ranking -> RLS
-- ============================================================

-- ============================================================
-- BTplay — schema inicial (MVP)
-- ============================================================

-- ---------- Extensões ----------
create extension if not exists "pgcrypto";

-- ============================================================
-- PROFILES
-- ============================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  avatar_url  text,
  phone       text,
  email       text,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- GROUPS
-- ============================================================
create table if not exists public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  logo_url    text,
  color       text not null default '#10b981',
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- GROUP MEMBERS
-- ============================================================
do $$ begin
  create type member_role as enum ('owner', 'admin', 'player');
exception when duplicate_object then null; end $$;

do $$ begin
  create type member_status as enum ('active', 'pending', 'inactive', 'suspended');
exception when duplicate_object then null; end $$;

create table if not exists public.group_members (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  role       member_role not null default 'player',
  status     member_status not null default 'active',
  nickname   text,
  level      text,
  joined_at  timestamptz not null default now(),
  unique (group_id, user_id)
);

-- ============================================================
-- GROUP SETTINGS
-- ============================================================
create table if not exists public.group_settings (
  group_id            uuid primary key references public.groups (id) on delete cascade,
  default_game_format int not null default 6,        -- games por set
  tie_break           boolean not null default true,
  monthly_fee         numeric(10,2) not null default 0,
  due_day             int not null default 10,
  pix_key             text,
  updated_at          timestamptz not null default now()
);

-- ============================================================
-- TOURNAMENTS
-- ============================================================
do $$ begin
  create type tournament_status as enum ('draft', 'ongoing', 'finished');
exception when duplicate_object then null; end $$;

create table if not exists public.tournaments (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references public.groups (id) on delete cascade,
  name         text not null,
  date         date,
  location     text,
  courts       int not null default 1,
  category     text,
  game_format  int not null default 6,    -- games por set (4,5,6 ou custom)
  tie_break    boolean not null default true,
  status       tournament_status not null default 'draft',
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now()
);

-- ============================================================
-- TOURNAMENT PLAYERS
-- ============================================================
create table if not exists public.tournament_players (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  confirmed     boolean not null default true,
  unique (tournament_id, user_id)
);

-- ============================================================
-- TEAMS (duplas)
-- ============================================================
create table if not exists public.teams (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  player1_id    uuid not null references public.profiles (id) on delete cascade,
  player2_id    uuid references public.profiles (id) on delete cascade,
  name          text,
  seed          int
);

-- ============================================================
-- MATCHES (jogos)
-- ============================================================
do $$ begin
  create type match_status as enum ('scheduled', 'ongoing', 'finished');
exception when duplicate_object then null; end $$;

create table if not exists public.matches (
  id              uuid primary key default gen_random_uuid(),
  tournament_id   uuid not null references public.tournaments (id) on delete cascade,
  phase           text not null default 'group',   -- group | quarter | semi | final | round
  group_label     text,                            -- A, B, C...
  court           int,
  play_order      int,
  team_a_id       uuid references public.teams (id) on delete cascade,
  team_b_id       uuid references public.teams (id) on delete cascade,
  status          match_status not null default 'scheduled',
  created_at      timestamptz not null default now()
);

-- ============================================================
-- MATCH RESULTS
-- ============================================================
create table if not exists public.match_results (
  id              uuid primary key default gen_random_uuid(),
  match_id        uuid not null unique references public.matches (id) on delete cascade,
  games_a         int not null default 0,
  games_b         int not null default 0,
  winner_team_id  uuid references public.teams (id) on delete set null,
  reported_by     uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- PAYMENTS (mensalidades)
-- ============================================================
do $$ begin
  create type payment_status as enum ('paid', 'pending', 'overdue', 'exempt');
exception when duplicate_object then null; end $$;

create table if not exists public.payments (
  id              uuid primary key default gen_random_uuid(),
  group_id        uuid not null references public.groups (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  amount          numeric(10,2) not null default 0,
  reference_month date not null,                 -- 1º dia do mês de referência
  due_date        date,
  status          payment_status not null default 'pending',
  receipt_url     text,
  paid_at         timestamptz,
  approved_by     uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  unique (group_id, user_id, reference_month)
);

create index if not exists idx_group_members_group on public.group_members (group_id);
create index if not exists idx_group_members_user on public.group_members (user_id);
create index if not exists idx_tournaments_group on public.tournaments (group_id);
create index if not exists idx_matches_tournament on public.matches (tournament_id);
create index if not exists idx_teams_tournament on public.teams (tournament_id);
create index if not exists idx_payments_group on public.payments (group_id);


-- ============================================================
-- BTplay — funções auxiliares, triggers e view de ranking
-- ============================================================

-- ---------- Novo usuário => cria profile ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Ao criar grupo => dono vira membro + settings ----------
create or replace function public.handle_new_group()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.group_members (group_id, user_id, role, status)
  values (new.id, new.owner_id, 'owner', 'active')
  on conflict (group_id, user_id) do nothing;

  insert into public.group_settings (group_id)
  values (new.id)
  on conflict (group_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_group_created on public.groups;
create trigger on_group_created
  after insert on public.groups
  for each row execute function public.handle_new_group();

-- ---------- Helpers de autorização (SECURITY DEFINER p/ evitar recursão RLS) ----------
create or replace function public.is_group_member(gid uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid and user_id = auth.uid()
  );
$$;

create or replace function public.is_group_admin(gid uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid and user_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$;

create or replace function public.tournament_group(tid uuid)
returns uuid
language sql
security definer set search_path = public
stable
as $$
  select group_id from public.tournaments where id = tid;
$$;

-- ---------- Define vencedor automaticamente pelo placar ----------
create or replace function public.set_match_winner()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  ta uuid;
  tb uuid;
begin
  select team_a_id, team_b_id into ta, tb from public.matches where id = new.match_id;
  if new.games_a > new.games_b then
    new.winner_team_id := ta;
  elsif new.games_b > new.games_a then
    new.winner_team_id := tb;
  else
    new.winner_team_id := null;
  end if;

  update public.matches set status = 'finished' where id = new.match_id;
  return new;
end;
$$;

drop trigger if exists on_result_set_winner on public.match_results;
create trigger on_result_set_winner
  before insert or update on public.match_results
  for each row execute function public.set_match_winner();

-- ============================================================
-- VIEW DE RANKING (por grupo / jogador)
-- ============================================================
create or replace view public.group_rankings
with (security_invoker = on) as
with results as (
  select
    t.group_id,
    tm.id          as team_id,
    tm.player1_id  as p1,
    tm.player2_id  as p2,
    mr.games_a, mr.games_b,
    m.team_a_id, m.team_b_id,
    mr.winner_team_id
  from public.match_results mr
  join public.matches m on m.id = mr.match_id
  join public.tournaments t on t.id = m.tournament_id
  join public.teams tm on tm.id in (m.team_a_id, m.team_b_id)
),
per_player as (
  -- desdobra cada time em seus jogadores
  select
    r.group_id,
    p.player_id,
    case when r.team_id = r.team_a_id then r.games_a else r.games_b end as games_won,
    case when r.team_id = r.team_a_id then r.games_b else r.games_a end as games_lost,
    case when r.winner_team_id = r.team_id then 1 else 0 end as is_win,
    case when r.winner_team_id is not null and r.winner_team_id <> r.team_id then 1 else 0 end as is_loss
  from results r
  cross join lateral (
    values (r.p1), (r.p2)
  ) as p(player_id)
  where p.player_id is not null
)
select
  pp.group_id,
  pp.player_id                                   as user_id,
  pr.full_name,
  pr.avatar_url,
  count(*)                                        as games_played,
  coalesce(sum(pp.is_win), 0)                     as wins,
  coalesce(sum(pp.is_loss), 0)                    as losses,
  coalesce(sum(pp.is_win), 0)                     as points,
  coalesce(sum(pp.games_won), 0)                  as games_for,
  coalesce(sum(pp.games_lost), 0)                 as games_against,
  coalesce(sum(pp.games_won), 0) - coalesce(sum(pp.games_lost), 0) as game_diff,
  round(
    100.0 * coalesce(sum(pp.is_win), 0) / nullif(count(*), 0)
  )                                               as win_pct
from per_player pp
join public.profiles pr on pr.id = pp.player_id
group by pp.group_id, pp.player_id, pr.full_name, pr.avatar_url;


-- ============================================================
-- BTplay — Row Level Security
-- ============================================================

alter table public.profiles          enable row level security;
alter table public.groups            enable row level security;
alter table public.group_members     enable row level security;
alter table public.group_settings    enable row level security;
alter table public.tournaments       enable row level security;
alter table public.tournament_players enable row level security;
alter table public.teams             enable row level security;
alter table public.matches           enable row level security;
alter table public.match_results     enable row level security;
alter table public.payments          enable row level security;

-- ---------- PROFILES ----------
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (id = auth.uid());

-- ---------- GROUPS ----------
drop policy if exists "groups_select" on public.groups;
create policy "groups_select" on public.groups
  for select to authenticated
  using (owner_id = auth.uid() or public.is_group_member(id));

drop policy if exists "groups_insert" on public.groups;
create policy "groups_insert" on public.groups
  for insert to authenticated with check (owner_id = auth.uid());

drop policy if exists "groups_update" on public.groups;
create policy "groups_update" on public.groups
  for update to authenticated using (public.is_group_admin(id)) with check (true);

drop policy if exists "groups_delete" on public.groups;
create policy "groups_delete" on public.groups
  for delete to authenticated using (owner_id = auth.uid());

-- ---------- GROUP MEMBERS ----------
drop policy if exists "members_select" on public.group_members;
create policy "members_select" on public.group_members
  for select to authenticated using (public.is_group_member(group_id));

drop policy if exists "members_insert" on public.group_members;
create policy "members_insert" on public.group_members
  for insert to authenticated
  with check (public.is_group_admin(group_id) or user_id = auth.uid());

drop policy if exists "members_update" on public.group_members;
create policy "members_update" on public.group_members
  for update to authenticated using (public.is_group_admin(group_id)) with check (true);

drop policy if exists "members_delete" on public.group_members;
create policy "members_delete" on public.group_members
  for delete to authenticated
  using (public.is_group_admin(group_id) or user_id = auth.uid());

-- ---------- GROUP SETTINGS ----------
drop policy if exists "settings_select" on public.group_settings;
create policy "settings_select" on public.group_settings
  for select to authenticated using (public.is_group_member(group_id));

drop policy if exists "settings_write" on public.group_settings;
create policy "settings_write" on public.group_settings
  for all to authenticated
  using (public.is_group_admin(group_id)) with check (public.is_group_admin(group_id));

-- ---------- TOURNAMENTS ----------
drop policy if exists "tournaments_select" on public.tournaments;
create policy "tournaments_select" on public.tournaments
  for select to authenticated using (public.is_group_member(group_id));

drop policy if exists "tournaments_write" on public.tournaments;
create policy "tournaments_write" on public.tournaments
  for all to authenticated
  using (public.is_group_admin(group_id)) with check (public.is_group_admin(group_id));

-- ---------- TOURNAMENT PLAYERS ----------
drop policy if exists "tp_select" on public.tournament_players;
create policy "tp_select" on public.tournament_players
  for select to authenticated
  using (public.is_group_member(public.tournament_group(tournament_id)));

drop policy if exists "tp_write" on public.tournament_players;
create policy "tp_write" on public.tournament_players
  for all to authenticated
  using (public.is_group_admin(public.tournament_group(tournament_id)))
  with check (public.is_group_admin(public.tournament_group(tournament_id)));

-- ---------- TEAMS ----------
drop policy if exists "teams_select" on public.teams;
create policy "teams_select" on public.teams
  for select to authenticated
  using (public.is_group_member(public.tournament_group(tournament_id)));

drop policy if exists "teams_write" on public.teams;
create policy "teams_write" on public.teams
  for all to authenticated
  using (public.is_group_admin(public.tournament_group(tournament_id)))
  with check (public.is_group_admin(public.tournament_group(tournament_id)));

-- ---------- MATCHES ----------
drop policy if exists "matches_select" on public.matches;
create policy "matches_select" on public.matches
  for select to authenticated
  using (public.is_group_member(public.tournament_group(tournament_id)));

drop policy if exists "matches_write" on public.matches;
create policy "matches_write" on public.matches
  for all to authenticated
  using (public.is_group_admin(public.tournament_group(tournament_id)))
  with check (public.is_group_admin(public.tournament_group(tournament_id)));

-- ---------- MATCH RESULTS ----------
drop policy if exists "results_select" on public.match_results;
create policy "results_select" on public.match_results
  for select to authenticated
  using (exists (
    select 1 from public.matches m
    where m.id = match_id
      and public.is_group_member(public.tournament_group(m.tournament_id))
  ));

drop policy if exists "results_write" on public.match_results;
create policy "results_write" on public.match_results
  for all to authenticated
  using (exists (
    select 1 from public.matches m
    where m.id = match_id
      and public.is_group_admin(public.tournament_group(m.tournament_id))
  ))
  with check (exists (
    select 1 from public.matches m
    where m.id = match_id
      and public.is_group_admin(public.tournament_group(m.tournament_id))
  ));

-- ---------- PAYMENTS ----------
drop policy if exists "payments_select" on public.payments;
create policy "payments_select" on public.payments
  for select to authenticated
  using (user_id = auth.uid() or public.is_group_admin(group_id));

drop policy if exists "payments_write" on public.payments;
create policy "payments_write" on public.payments
  for all to authenticated
  using (public.is_group_admin(group_id)) with check (public.is_group_admin(group_id));

-- jogador pode anexar comprovante (update) à própria mensalidade
drop policy if exists "payments_update_own_receipt" on public.payments;
create policy "payments_update_own_receipt" on public.payments
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
