-- ============================================================
-- 0017: observação da jogadora sobre a própria performance no torneio.
--       Perguntada na hora de encerrar; pode ficar em branco.
-- ============================================================

alter table public.external_tournaments
  add column if not exists notes text;
