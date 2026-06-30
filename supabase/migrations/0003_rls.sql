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
