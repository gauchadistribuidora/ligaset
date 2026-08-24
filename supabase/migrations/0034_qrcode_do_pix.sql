-- ============================================================
-- 0034: QR Code do Pix. O padrão do Banco Central é aberto, então
--       o código é montado no próprio app — sem gateway, sem taxa
--       e sem serviço de terceiro no meio.
-- ============================================================

-- Onze dígitos podem ser CPF ou celular com DDD, e o banco só reconhece a
-- chave no formato certo (telefone vai com +55, CPF vai só com dígitos). O
-- palpite acerta quase sempre pelo dígito verificador do CPF, mas em Pix
-- "quase sempre" não serve: o administrador diz o tipo.
alter table public.group_settings
  add column if not exists pix_key_type text
  check (pix_key_type is null or pix_key_type in ('cpf','cnpj','telefone','email','aleatoria'));

-- Cidade do recebedor entra no QR; sem ela o padrão exige um valor qualquer.
alter table public.group_settings
  add column if not exists pix_city text;

-- O convite passa a devolver o tipo da chave e a cidade, para montar o QR na
-- própria página.
create or replace function public.public_invite_info(p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  inv record;
  atletas json;
  confirmados int;
begin
  select gi.id, gi.group_id, gi.tournament_id,
         g.name as grupo,
         gm.name as convidou,
         gs.pix_key, gs.guest_fee, gs.pix_key_type, gs.pix_city,
         coalesce(t.capacity, gs.capacity) as vagas,
         t.name as torneio, t.date as data, t.location as local, t.courts as quadras
    into inv
  from public.guest_invites gi
  join public.groups g on g.id = gi.group_id
  left join public.group_members gm on gm.id = gi.invited_by
  left join public.group_settings gs on gs.group_id = gi.group_id
  left join public.tournaments t on t.id = gi.tournament_id
  where gi.code = p_code;

  if inv.id is null then
    return json_build_object('error', 'Convite inválido ou expirado.');
  end if;

  select coalesce(json_agg(json_build_object('id', x.id, 'name', x.name) order by x.name), '[]'::json)
    into atletas
  from (
    select gm2.id, gm2.name from public.group_members gm2
    where gm2.group_id = inv.group_id and gm2.status = 'active' and not gm2.is_guest
  ) x;

  select count(*) into confirmados
  from public.attendance a
  where a.tournament_id = inv.tournament_id and a.status = 'yes';

  return json_build_object(
    'grupo', inv.grupo,
    'convidou', inv.convidou,
    'torneio', inv.torneio,
    'data', inv.data,
    'local', inv.local,
    'quadras', inv.quadras,
    'pix', inv.pix_key,
    'pix_tipo', inv.pix_key_type,
    'pix_cidade', inv.pix_city,
    'valor', inv.guest_fee,
    'vagas', inv.vagas,
    'confirmados', coalesce(confirmados, 0),
    'atletas', atletas
  );
end;
$$;

grant execute on function public.public_invite_info(text) to anon, authenticated;
