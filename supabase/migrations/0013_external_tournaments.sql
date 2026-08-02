-- ============================================================
-- 0013: torneios externos — histórico pessoal de torneios
--       disputados fora do Ligaset
-- ============================================================

create table if not exists public.external_tournaments (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  name            text not null,
  tournament_date date,
  category        text,
  partner_name    text,
  -- planned = agendado (agenda de torneios futuros)
  status          text not null default 'ongoing'
                  check (status in ('planned', 'ongoing', 'finished')),
  -- fase que a dupla está disputando agora
  current_phase   text not null default 'group'
                  check (current_phase in ('group', 'r32', 'r16', 'qf', 'sf', 'final')),
  -- fase em que parou; preenchida ao encerrar o torneio
  final_phase     text
                  check (final_phase in ('group', 'r32', 'r16', 'qf', 'sf', 'final')),
  champion        boolean not null default false,
  created_at      timestamptz not null default now()
);
create index if not exists idx_ext_tournaments_user
  on public.external_tournaments (user_id, tournament_date desc);

create table if not exists public.external_matches (
  id             uuid primary key default gen_random_uuid(),
  tournament_id  uuid not null references public.external_tournaments (id) on delete cascade,
  phase          text not null
                 check (phase in ('group', 'r32', 'r16', 'qf', 'sf', 'final')),
  opponent1      text,
  opponent2      text,
  -- placar por set: [[6,4],[3,6],[10,8]]
  set_scores     jsonb not null default '[]'::jsonb,
  games_for      int not null default 0,
  games_against  int not null default 0,
  won            boolean not null,
  created_at     timestamptz not null default now()
);
create index if not exists idx_ext_matches_tournament
  on public.external_matches (tournament_id);

alter table public.external_tournaments enable row level security;
alter table public.external_matches enable row level security;

-- Cada jogador enxerga e escreve apenas o próprio histórico.
-- A trava de "só administrador" fica na rota do app, não aqui: assim, no dia
-- em que o módulo for liberado para todos, nada precisa mudar no banco.
drop policy if exists "ext_tournaments_all" on public.external_tournaments;
create policy "ext_tournaments_all" on public.external_tournaments
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "ext_matches_all" on public.external_matches;
create policy "ext_matches_all" on public.external_matches
  for all to authenticated
  using (
    exists (
      select 1 from public.external_tournaments t
      where t.id = external_matches.tournament_id
        and t.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.external_tournaments t
      where t.id = external_matches.tournament_id
        and t.user_id = (select auth.uid())
    )
  );
