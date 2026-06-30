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
