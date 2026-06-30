-- ============================================================
-- Ligaset — 0004: roster de jogadores
-- Admin cadastra jogadores só com nome + telefone (sem login).
-- E-mail é opcional; ao convidar, o jogador vira usuário ligado.
-- ============================================================

-- ---------- group_members: vira o "jogador" do grupo ----------
alter table public.group_members alter column user_id drop not null;
alter table public.group_members add column if not exists name  text;
alter table public.group_members add column if not exists phone text;
alter table public.group_members add column if not exists email text;

-- não permitir o mesmo e-mail duas vezes no grupo
create unique index if not exists uq_group_members_email
  on public.group_members (group_id, lower(email)) where email is not null;

-- ---------- tournament_players passa a apontar p/ group_members ----------
alter table public.tournament_players drop constraint if exists tournament_players_user_id_fkey;
alter table public.tournament_players drop constraint if exists tournament_players_tournament_id_user_id_key;
alter table public.tournament_players add column if not exists member_id uuid references public.group_members (id) on delete cascade;
alter table public.tournament_players drop column if exists user_id;
create unique index if not exists uq_tp_member on public.tournament_players (tournament_id, member_id);

-- ---------- teams: jogadores agora são group_members ----------
alter table public.teams drop constraint if exists teams_player1_id_fkey;
alter table public.teams drop constraint if exists teams_player2_id_fkey;
alter table public.teams
  add constraint teams_player1_member_fkey foreign key (player1_id) references public.group_members (id) on delete cascade;
alter table public.teams
  add constraint teams_player2_member_fkey foreign key (player2_id) references public.group_members (id) on delete cascade;

-- ---------- ao criar grupo, o dono entra no roster com nome/e-mail ----------
create or replace function public.handle_new_group()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.group_members (group_id, user_id, role, status, name, email)
  select new.id, new.owner_id, 'owner', 'active', p.full_name, p.email
  from public.profiles p where p.id = new.owner_id
  on conflict (group_id, user_id) do nothing;

  insert into public.group_settings (group_id)
  values (new.id)
  on conflict (group_id) do nothing;

  return new;
end;
$$;

-- ---------- ao um e-mail virar usuário, liga ao jogador do roster ----------
create or replace function public.link_member_on_signup()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.group_members gm
  set user_id = new.id
  where gm.user_id is null
    and gm.email is not null
    and lower(gm.email) = lower(new.email);
  return new;
end;
$$;

drop trigger if exists on_profile_link_member on public.profiles;
create trigger on_profile_link_member
  after insert on public.profiles
  for each row execute function public.link_member_on_signup();

-- ---------- view de ranking por jogador (group_members) ----------
drop view if exists public.group_rankings;
create or replace view public.group_rankings
with (security_invoker = on) as
with results as (
  select
    t.group_id, tm.id as team_id, tm.player1_id as p1, tm.player2_id as p2,
    mr.games_a, mr.games_b, m.team_a_id, m.team_b_id, mr.winner_team_id
  from public.match_results mr
  join public.matches m      on m.id = mr.match_id
  join public.tournaments t  on t.id = m.tournament_id
  join public.teams tm       on tm.id in (m.team_a_id, m.team_b_id)
),
per_player as (
  select
    r.group_id, p.member_id,
    case when r.team_id = r.team_a_id then r.games_a else r.games_b end as games_won,
    case when r.team_id = r.team_a_id then r.games_b else r.games_a end as games_lost,
    case when r.winner_team_id = r.team_id then 1 else 0 end as is_win,
    case when r.winner_team_id is not null and r.winner_team_id <> r.team_id then 1 else 0 end as is_loss
  from results r
  cross join lateral (values (r.p1), (r.p2)) as p(member_id)
  where p.member_id is not null
)
select
  pp.group_id,
  pp.member_id,
  gm.user_id,
  coalesce(gm.name, pr.full_name)        as full_name,
  pr.avatar_url,
  count(*)                                as games_played,
  coalesce(sum(pp.is_win), 0)            as wins,
  coalesce(sum(pp.is_loss), 0)           as losses,
  coalesce(sum(pp.is_win), 0)            as points,
  coalesce(sum(pp.games_won), 0)         as games_for,
  coalesce(sum(pp.games_lost), 0)        as games_against,
  coalesce(sum(pp.games_won), 0) - coalesce(sum(pp.games_lost), 0) as game_diff,
  round(100.0 * coalesce(sum(pp.is_win), 0) / nullif(count(*), 0)) as win_pct
from per_player pp
join public.group_members gm on gm.id = pp.member_id
left join public.profiles pr on pr.id = gm.user_id
group by pp.group_id, pp.member_id, gm.user_id, gm.name, pr.full_name, pr.avatar_url;
