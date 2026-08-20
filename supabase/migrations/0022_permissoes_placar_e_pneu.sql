-- ============================================================
-- 0022: quem pode lançar placar e quem pode mexer no pneu.
-- ============================================================

-- Participantes do torneio podem lançar placar, se o dono autorizar.
alter table public.group_settings
  add column if not exists players_can_score boolean not null default false;

-- Autorização individual para mexer no ranking do pneu.
alter table public.group_members
  add column if not exists can_manage_pneu boolean not null default false;

create or replace function public.can_manage_pneu(gid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_group_admin(gid)
      or exists (
        select 1 from public.group_members gm
        where gm.group_id = gid
          and gm.user_id = auth.uid()
          and gm.can_manage_pneu
          and gm.status = 'active'
      );
$$;

revoke execute on function public.can_manage_pneu(uuid) from anon;
grant execute on function public.can_manage_pneu(uuid) to authenticated;

drop policy if exists "pneus_write" on public.pneus;
create policy "pneus_write" on public.pneus
  for all to authenticated
  using (public.can_manage_pneu(group_id))
  with check (public.can_manage_pneu(group_id));
