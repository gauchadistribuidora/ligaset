-- ============================================================
-- Ligaset — 0006: mensalidades por jogador (group_members)
-- Admin controla tudo: incluir, editar valor/status/vencimento, excluir.
-- Passa a cobrar qualquer jogador do roster (com ou sem login).
-- ============================================================

alter table public.payments
  add column if not exists member_id uuid references public.group_members (id) on delete cascade;

-- backfill: liga pagamentos antigos (por user_id) ao membro correspondente
update public.payments p
set member_id = gm.id
from public.group_members gm
where p.member_id is null
  and gm.group_id = p.group_id
  and gm.user_id = p.user_id;

-- políticas que dependem de user_id precisam sair antes de dropar a coluna
drop policy if exists "payments_update_own_receipt" on public.payments;
drop policy if exists "payments_select" on public.payments;

-- remove pagamentos órfãos e a estrutura antiga baseada em user_id
delete from public.payments where member_id is null;
alter table public.payments drop constraint if exists payments_group_id_user_id_reference_month_key;
alter table public.payments drop column if exists user_id;
alter table public.payments alter column member_id set not null;

create unique index if not exists uq_payments_member_month
  on public.payments (group_id, member_id, reference_month);

-- RLS: admin vê tudo; jogador logado vê as próprias (via membro vinculado)
create policy "payments_select" on public.payments
  for select to authenticated
  using (
    public.is_group_admin(group_id)
    or exists (
      select 1 from public.group_members gm
      where gm.id = member_id and gm.user_id = auth.uid()
    )
  );
