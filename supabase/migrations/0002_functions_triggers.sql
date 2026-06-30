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
