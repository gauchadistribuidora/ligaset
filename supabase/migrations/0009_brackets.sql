-- ============================================================
-- Ligaset — 0009: chaveamento (eliminatória direta e grupos + mata-mata)
-- ============================================================

-- ---------- matches: campos de bracket ----------
alter table public.matches add column if not exists round         int;
alter table public.matches add column if not exists slot          int;
alter table public.matches add column if not exists next_match_id uuid references public.matches (id) on delete set null;
alter table public.matches add column if not exists next_slot     smallint;

-- duplas podem estar indefinidas (a definir) até o vencedor subir
alter table public.matches alter column team_a_id drop not null;
alter table public.matches alter column team_b_id drop not null;

-- ---------- tournaments: config de grupos ----------
alter table public.tournaments add column if not exists groups_count  int default 2;
alter table public.tournaments add column if not exists advance_count int default 2;

-- ---------- avanço automático do vencedor no mata-mata ----------
create or replace function public.advance_ko_winner()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  nm uuid;
  ns smallint;
begin
  select m.next_match_id, m.next_slot into nm, ns
  from public.matches m where m.id = new.match_id;

  if nm is not null and new.winner_team_id is not null then
    if ns = 0 then
      update public.matches set team_a_id = new.winner_team_id where id = nm;
    else
      update public.matches set team_b_id = new.winner_team_id where id = nm;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists on_result_advance_ko on public.match_results;
create trigger on_result_advance_ko
  after insert or update on public.match_results
  for each row execute function public.advance_ko_winner();
