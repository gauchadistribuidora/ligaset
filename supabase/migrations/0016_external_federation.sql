-- ============================================================
-- 0016: federação do torneio externo (FGT, FGBT, CBT ou outra).
--       Texto livre de propósito: federação nova não pode exigir
--       migration. A tela oferece as conhecidas e deixa digitar.
-- ============================================================

alter table public.external_tournaments
  add column if not exists federation text;
