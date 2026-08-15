-- ============================================================
-- 0018: ranking do pneu e lista de confirmação de presença.
--       Os dois são opcionais por grupo — nem toda turma usa.
-- ============================================================

alter table public.group_settings
  add column if not exists pneu_enabled boolean not null default false;
alter table public.group_settings
  add column if not exists confirmations_enabled boolean not null default false;

-- ---------- pneu ----------
-- Quem perde de zero leva um pneu. Cada linha é um lançamento; a quantidade
-- pode ser negativa para corrigir um lançamento errado sem apagar o histórico.
create table if not exists public.pneus (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references public.groups (id) on delete cascade,
  member_id   uuid not null references public.group_members (id) on delete cascade,
  qty         int  not null default 1 check (qty <> 0),
  occurred_on date not null default current_date,
  note        text,
  created_by  uuid references public.profiles (id),
  created_at  timestamptz not null default now()
);
create index if not exists idx_pneus_group on public.pneus (group_id, occurred_on desc);

alter table public.pneus enable row level security;

-- Todo mundo do grupo vê o ranking; só o administrador lança e corrige.
drop policy if exists "pneus_select" on public.pneus;
create policy "pneus_select" on public.pneus
  for select to authenticated using (public.is_group_member(group_id));

drop policy if exists "pneus_write" on public.pneus;
create policy "pneus_write" on public.pneus
  for all to authenticated
  using (public.is_group_admin(group_id))
  with check (public.is_group_admin(group_id));

-- ---------- confirmação de presença ----------
alter table public.tournaments
  add column if not exists confirmations_open boolean not null default false;

create table if not exists public.attendance (
  id            uuid primary key default gen_random_uuid(),
  group_id      uuid not null references public.groups (id) on delete cascade,
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  member_id     uuid not null references public.group_members (id) on delete cascade,
  status        text not null check (status in ('yes', 'no')),
  updated_at    timestamptz not null default now(),
  unique (tournament_id, member_id)
);
create index if not exists idx_attendance_tournament
  on public.attendance (tournament_id);

alter table public.attendance enable row level security;

-- Todos do grupo enxergam quem confirmou.
drop policy if exists "attendance_select" on public.attendance;
create policy "attendance_select" on public.attendance
  for select to authenticated using (public.is_group_member(group_id));

-- Cada um responde por si; o administrador pode responder por qualquer um
-- (tem gente que avisa por telefone e não abre o app).
drop policy if exists "attendance_write" on public.attendance;
create policy "attendance_write" on public.attendance
  for all to authenticated
  using (
    public.is_group_admin(group_id)
    or exists (
      select 1 from public.group_members gm
      where gm.id = attendance.member_id
        and gm.user_id = (select auth.uid())
    )
  )
  with check (
    public.is_group_admin(group_id)
    or exists (
      select 1 from public.group_members gm
      where gm.id = attendance.member_id
        and gm.user_id = (select auth.uid())
    )
  );
