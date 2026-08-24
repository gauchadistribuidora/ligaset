-- ============================================================
-- 0036: receita lançada na mão. Rifa, patrocínio, venda de
--       camiseta — o que entra e não passa pela mensalidade.
--       Espelha a tabela de despesas.
-- ============================================================

create table if not exists public.revenues (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references public.groups (id) on delete cascade,
  description  text not null,
  amount       numeric(10,2) not null default 0,
  revenue_date date not null default current_date,
  category     text,
  created_by   uuid references public.profiles (id),
  created_at   timestamptz not null default now()
);

create index if not exists idx_revenues_group on public.revenues (group_id);

alter table public.revenues enable row level security;

-- Mesma regra da despesa: membro vê, administrador mexe.
drop policy if exists "revenues_select" on public.revenues;
create policy "revenues_select" on public.revenues
  for select to authenticated using (public.is_group_member(group_id));

drop policy if exists "revenues_write" on public.revenues;
create policy "revenues_write" on public.revenues
  for all to authenticated
  using (public.is_group_admin(group_id)) with check (public.is_group_admin(group_id));
