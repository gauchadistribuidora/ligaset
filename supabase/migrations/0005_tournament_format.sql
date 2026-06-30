-- ============================================================
-- Ligaset — 0005: tipo de torneio (formato)
-- round_robin (padrão, todos contra todos) | manual (admin cria os jogos)
-- ============================================================

alter table public.tournaments
  add column if not exists format text not null default 'round_robin';
