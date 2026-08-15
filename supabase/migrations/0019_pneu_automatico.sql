-- ============================================================
-- 0019: pneu automático — lançado pelo próprio placar.
--       Guardar o jogo de origem é o que permite refazer o
--       lançamento quando o placar é corrigido, sem duplicar.
-- ============================================================

alter table public.pneus
  add column if not exists match_id uuid references public.matches (id) on delete cascade;
alter table public.pneus
  add column if not exists auto boolean not null default false;

-- Um pneu automático por atleta por jogo.
create unique index if not exists idx_pneus_auto_unico
  on public.pneus (match_id, member_id)
  where match_id is not null;
