-- ============================================================
-- 0041: mural dos campeoes. Guarda o que o app organizou e o
--       que veio de antes dele.
-- ============================================================

create table if not exists public.champions (
  id            uuid primary key default gen_random_uuid(),
  group_id      uuid not null references public.groups (id) on delete cascade,
  tournament_id uuid references public.tournaments (id) on delete set null,
  titulo        text not null,
  event_date    date,
  categoria     text,
  -- Dupla campea: id quando e do grupo, nome livre quando nao e. Quem jogou
  -- antes do app existir nunca teve cadastro.
  member1_id    uuid references public.group_members (id) on delete set null,
  nome1         text,
  member2_id    uuid references public.group_members (id) on delete set null,
  nome2         text,
  observacao    text,
  created_by    uuid references public.profiles (id),
  created_at    timestamptz not null default now(),
  -- Sem nome nem membro nao e campeao nenhum.
  constraint champions_tem_alguem check (
    member1_id is not null or nullif(btrim(coalesce(nome1, '')), '') is not null
  )
);

create index if not exists idx_champions_group
  on public.champions (group_id, event_date desc nulls last);

alter table public.champions enable row level security;

-- Mural e do grupo: todo mundo ve, administrador cadastra.
drop policy if exists champions_select on public.champions;
create policy champions_select on public.champions
  for select to authenticated using (public.is_group_member(group_id));

drop policy if exists champions_write on public.champions;
create policy champions_write on public.champions
  for all to authenticated
  using (public.is_group_admin(group_id)) with check (public.is_group_admin(group_id));
