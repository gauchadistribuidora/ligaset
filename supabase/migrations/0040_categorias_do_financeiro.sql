-- ============================================================
-- 0040: categorias proprias do grupo, somadas as que ja vem no
--       app. Cada grupo tem as suas: van, arbitragem, bazar.
-- ============================================================

create table if not exists public.finance_categories (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups (id) on delete cascade,
  kind       text not null check (kind in ('receita', 'despesa')),
  name       text not null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

-- Sem repetir a mesma categoria com outra caixa ("Rifa" e "rifa"): categoria
-- escrita de dois jeitos nunca agrupa direito no relatorio.
create unique index if not exists uq_finance_categories
  on public.finance_categories (group_id, kind, lower(name));

create index if not exists idx_finance_categories_group
  on public.finance_categories (group_id, kind);

alter table public.finance_categories enable row level security;

drop policy if exists finance_categories_select on public.finance_categories;
create policy finance_categories_select on public.finance_categories
  for select to authenticated using (public.is_group_member(group_id));

drop policy if exists finance_categories_write on public.finance_categories;
create policy finance_categories_write on public.finance_categories
  for all to authenticated
  using (public.is_group_admin(group_id)) with check (public.is_group_admin(group_id));
