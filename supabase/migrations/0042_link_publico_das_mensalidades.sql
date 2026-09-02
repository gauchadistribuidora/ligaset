-- ============================================================
-- 0042: link publico das mensalidades do mes. Quem pagou, quem
--       falta e o QR de quem quer pagar na hora.
-- ============================================================

-- Um link por mes, com sufixo aleatorio: endereco adivinhavel exporia a
-- situacao financeira do grupo para qualquer um.
create table if not exists public.payment_links (
  id              uuid primary key default gen_random_uuid(),
  group_id        uuid not null references public.groups (id) on delete cascade,
  reference_month date not null,
  code            text not null unique,
  created_by      uuid references public.profiles (id),
  created_at      timestamptz not null default now(),
  unique (group_id, reference_month)
);

alter table public.payment_links enable row level security;

drop policy if exists payment_links_admin on public.payment_links;
create policy payment_links_admin on public.payment_links
  for all to authenticated
  using (public.is_group_admin(group_id)) with check (public.is_group_admin(group_id));

-- Devolve o minimo: nome, valor e situacao. Nenhum contato e nenhum id de
-- pessoa — a pagina e aberta e nao precisa de mais que isso.
create or replace function public.public_payments_month(p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  l record;
  gente json;
  venc date;
begin
  select pl.group_id, pl.reference_month,
         g.name as grupo,
         gs.pix_key, gs.pix_key_type, gs.pix_city, gs.due_day
    into l
  from public.payment_links pl
  join public.groups g on g.id = pl.group_id
  left join public.group_settings gs on gs.group_id = pl.group_id
  where pl.code = p_code;

  if l.group_id is null then
    return json_build_object('error', 'Link não encontrado.');
  end if;

  select min(p.due_date) into venc
  from public.payments p
  where p.group_id = l.group_id
    and p.reference_month = l.reference_month
    and p.tournament_id is null;

  select coalesce(json_agg(json_build_object(
           'nome', x.nome,
           'valor', x.amount,
           'pago', x.pago
         ) order by x.pago desc, x.nome), '[]'::json)
    into gente
  from (
    select coalesce(gm.name, 'Jogador') as nome,
           p.amount,
           (p.status = 'paid') as pago
    from public.payments p
    join public.group_members gm on gm.id = p.member_id
    where p.group_id = l.group_id
      and p.reference_month = l.reference_month
      and p.tournament_id is null
  ) x;

  return json_build_object(
    'grupo', l.grupo,
    'mes', l.reference_month,
    'vencimento', venc,
    'pix', l.pix_key,
    'pix_tipo', l.pix_key_type,
    'pix_cidade', l.pix_city,
    'gente', gente
  );
end;
$$;

grant execute on function public.public_payments_month(text) to anon, authenticated;
