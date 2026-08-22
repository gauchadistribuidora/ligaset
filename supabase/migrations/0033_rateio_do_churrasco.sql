-- ============================================================
-- 0033: rateio da carne. Quem comprou lança o gasto e o Pix
--       dele, e o app divide entre quem marcou o churrasco.
-- ============================================================

alter table public.tournaments
  add column if not exists churrasco_total numeric,
  add column if not exists churrasco_pix text,
  add column if not exists churrasco_payee uuid references public.group_members (id) on delete set null;

-- A cobrança passa a carregar o próprio Pix: a do churrasco vai para quem
-- comprou a carne, não para o caixa do grupo. `kind` separa mensalidade,
-- convidado e churrasco.
alter table public.payments
  add column if not exists pix_key text,
  add column if not exists kind text;

-- O índice único por mês nasceu quando pagamento era só mensalidade: um por
-- pessoa por mês. Agora existe cobrança ligada a jogo (convidado e churrasco),
-- e duas no mesmo mês são normais — o mesmo convidado pode vir duas quintas, e
-- quem come churrasco pode comer de novo. Do jeito que estava, a segunda
-- cobrança estourava a chave e derrubava a confirmação inteira.
--
-- A regra continua valendo para a mensalidade, que é a que não pode duplicar.
drop index if exists public.uq_payments_member_month;

create unique index uq_payments_member_month
  on public.payments (group_id, member_id, reference_month)
  where tournament_id is null;
