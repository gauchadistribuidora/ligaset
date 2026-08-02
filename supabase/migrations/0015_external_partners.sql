-- ============================================================
-- 0015: lista de parceiros dos torneios externos.
--       O relatório de melhor/pior dupla agrupa pelo nome do parceiro.
--       Se o nome for digitado à mão toda vez, "Ana Paula", "ana paula" e
--       "Ana P." viram três pessoas diferentes e o relatório mente.
--       Com a lista, escolhe-se sempre o mesmo registro.
-- ============================================================

create table if not exists public.external_partners (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_ext_partners_unique
  on public.external_partners (user_id, lower(name));

alter table public.external_partners enable row level security;

drop policy if exists "ext_partners_all" on public.external_partners;
create policy "ext_partners_all" on public.external_partners
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
