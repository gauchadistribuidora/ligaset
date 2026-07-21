-- ============================================================
-- 0011: controle de despesas do grupo (financeiro)
-- ============================================================
create table if not exists public.expenses (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references public.groups (id) on delete cascade,
  description  text not null,
  amount       numeric(10,2) not null default 0,
  expense_date date not null default current_date,
  category     text,
  created_by   uuid references public.profiles (id),
  created_at   timestamptz not null default now()
);
create index if not exists idx_expenses_group on public.expenses (group_id);

alter table public.expenses enable row level security;

drop policy if exists "expenses_select" on public.expenses;
create policy "expenses_select" on public.expenses
  for select to authenticated using (public.is_group_member(group_id));

drop policy if exists "expenses_write" on public.expenses;
create policy "expenses_write" on public.expenses
  for all to authenticated
  using (public.is_group_admin(group_id)) with check (public.is_group_admin(group_id));
