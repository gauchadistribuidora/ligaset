-- ============================================================
-- 0024: convite de amigo e a figura do convidado.
--       O convidado joga com o grupo mas não é membro — dá para
--       acompanhar quantas vezes veio antes de convidar de vez.
-- ============================================================

alter table public.group_members
  add column if not exists is_guest boolean not null default false;

-- Quanto o convidado paga pela quadra.
alter table public.group_settings
  add column if not exists guest_fee numeric(10,2);

create table if not exists public.guest_invites (
  id            uuid primary key default gen_random_uuid(),
  group_id      uuid not null references public.groups (id) on delete cascade,
  tournament_id uuid references public.tournaments (id) on delete cascade,
  invited_by    uuid references public.group_members (id) on delete set null,
  code          text not null unique,
  created_at    timestamptz not null default now()
);
create index if not exists idx_guest_invites_group
  on public.guest_invites (group_id, created_at desc);

alter table public.guest_invites enable row level security;

drop policy if exists "guest_invites_select" on public.guest_invites;
create policy "guest_invites_select" on public.guest_invites
  for select to authenticated using (public.is_group_member(group_id));

-- Qualquer membro pode convidar um amigo; não precisa ser administrador.
drop policy if exists "guest_invites_insert" on public.guest_invites;
create policy "guest_invites_insert" on public.guest_invites
  for insert to authenticated with check (public.is_group_member(group_id));

drop policy if exists "guest_invites_delete" on public.guest_invites;
create policy "guest_invites_delete" on public.guest_invites
  for delete to authenticated using (public.is_group_admin(group_id));
