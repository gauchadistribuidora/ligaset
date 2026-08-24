-- ============================================================
-- 0035: cobrança por link. O administrador gera um endereço com
--       valor (ou sem) e manda para quem quiser. Quem abre vê o
--       QR e o copia e cola da chave Pix do grupo.
-- ============================================================

create table if not exists public.charge_links (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  code text not null unique,
  amount numeric,
  description text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_charge_links_group on public.charge_links (group_id);

alter table public.charge_links enable row level security;

-- Só dono e administrador do grupo mexem. A leitura pública é pela função
-- abaixo, que devolve o mínimo e exige saber o código.
drop policy if exists charge_links_admin on public.charge_links;
create policy charge_links_admin on public.charge_links
  for all
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = charge_links.group_id
        and gm.user_id = auth.uid()
        and gm.role in ('owner', 'admin')
        and gm.status = 'active'
    )
  )
  with check (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = charge_links.group_id
        and gm.user_id = auth.uid()
        and gm.role in ('owner', 'admin')
        and gm.status = 'active'
    )
  );

create or replace function public.public_charge_info(p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  c record;
begin
  select cl.amount, cl.description,
         g.name as grupo,
         gs.pix_key, gs.pix_key_type, gs.pix_city
    into c
  from public.charge_links cl
  join public.groups g on g.id = cl.group_id
  left join public.group_settings gs on gs.group_id = cl.group_id
  where cl.code = p_code;

  if c.grupo is null then
    return json_build_object('error', 'Cobrança não encontrada.');
  end if;
  if c.pix_key is null then
    return json_build_object('error', 'Este grupo ainda não cadastrou a chave Pix.');
  end if;

  return json_build_object(
    'grupo', c.grupo,
    'valor', c.amount,
    'descricao', c.description,
    'pix', c.pix_key,
    'pix_tipo', c.pix_key_type,
    'pix_cidade', c.pix_city
  );
end;
$$;

grant execute on function public.public_charge_info(text) to anon, authenticated;
