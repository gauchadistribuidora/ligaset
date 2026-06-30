-- ============================================================
-- Ligaset — 0008: fotos de perfil e logo do grupo
-- avatar_url no jogador (roster) e logo_url no grupo + Storage.
-- ============================================================

-- ---------- colunas ----------
alter table public.group_members add column if not exists avatar_url text;
alter table public.groups        add column if not exists logo_url   text;

-- ---------- view de ranking usa a foto do jogador (roster) ----------
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
  coalesce(gm.name, pr.full_name)                 as full_name,
  coalesce(gm.avatar_url, pr.avatar_url)           as avatar_url,
  count(*)                                         as games_played,
  coalesce(sum(pp.is_win), 0)                      as wins,
  coalesce(sum(pp.is_loss), 0)                     as losses,
  coalesce(sum(pp.is_win), 0)                      as points,
  coalesce(sum(pp.games_won), 0)                   as games_for,
  coalesce(sum(pp.games_lost), 0)                  as games_against,
  coalesce(sum(pp.games_won), 0) - coalesce(sum(pp.games_lost), 0) as game_diff,
  round(100.0 * coalesce(sum(pp.is_win), 0) / nullif(count(*), 0)) as win_pct
from per_player pp
join public.group_members gm on gm.id = pp.member_id
left join public.profiles pr on pr.id = gm.user_id
group by pp.group_id, pp.member_id, gm.user_id, gm.name, gm.avatar_url, pr.full_name, pr.avatar_url;

-- ---------- buckets de Storage (públicos p/ leitura) ----------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do update set public = true;

-- ---------- policies: leitura pública, escrita autenticada ----------
drop policy if exists "media public read"   on storage.objects;
drop policy if exists "media auth insert"    on storage.objects;
drop policy if exists "media auth update"    on storage.objects;
drop policy if exists "media auth delete"    on storage.objects;

create policy "media public read" on storage.objects
  for select using (bucket_id in ('avatars', 'logos'));

create policy "media auth insert" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('avatars', 'logos'));

create policy "media auth update" on storage.objects
  for update to authenticated
  using (bucket_id in ('avatars', 'logos'));

create policy "media auth delete" on storage.objects
  for delete to authenticated
  using (bucket_id in ('avatars', 'logos'));
