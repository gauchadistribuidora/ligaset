-- ============================================================
-- Ligaset — 0007: modalidade do grupo + sets no torneio
-- ============================================================

-- modalidade do grupo (beach, padel, volei, futevolei, tenis)
alter table public.groups
  add column if not exists modality text not null default 'beach';

-- número de sets do torneio + placar por set
alter table public.tournaments
  add column if not exists sets int not null default 1;

alter table public.match_results
  add column if not exists set_scores jsonb;

-- vencedor: 1 set -> por games; multi-set -> o app define (games totais + winner por sets)
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
  if new.set_scores is null then
    if new.games_a > new.games_b then
      new.winner_team_id := ta;
    elsif new.games_b > new.games_a then
      new.winner_team_id := tb;
    else
      new.winner_team_id := null;
    end if;
  end if;
  update public.matches set status = 'finished' where id = new.match_id;
  return new;
end;
$$;
