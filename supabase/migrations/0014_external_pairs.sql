-- ============================================================
-- 0014: agenda de duplas adversárias dos torneios externos.
--       Em torneio a gente encara sempre as mesmas duplas, então
--       vale cadastrar uma vez e só escolher na hora de lançar.
-- ============================================================

create table if not exists public.external_pairs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  player1    text not null,
  player2    text not null,
  created_at timestamptz not null default now()
);

-- Os nomes são gravados já ordenados pela ação do app, então "Ana/Bia" e
-- "Bia/Ana" caem na mesma linha e a dupla não duplica.
create unique index if not exists idx_ext_pairs_unique
  on public.external_pairs (user_id, lower(player1), lower(player2));

alter table public.external_pairs enable row level security;

drop policy if exists "ext_pairs_all" on public.external_pairs;
create policy "ext_pairs_all" on public.external_pairs
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
