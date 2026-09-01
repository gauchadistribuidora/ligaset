-- ============================================================
-- 0038: endereço legível para o resumo do jogo, sem quebrar o
--       link de confirmação que já circula.
-- ============================================================

alter table public.tournaments
  add column if not exists slug text unique;

-- Gera o endereço dos jogos que já existem. O sufixo aleatório continua:
-- nome legível não pode virar endereço adivinhável, senão qualquer um lê a
-- lista de presença de outro grupo.
with base as (
  select t.id,
         trim(both '-' from
           regexp_replace(
             lower(translate(
               coalesce(t.name,'jogo') || '-' || coalesce(to_char(t.date,'DD-mm'), ''),
               'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
               'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'
             )),
             '[^a-z0-9]+', '-', 'g')
         ) as apelido
  from public.tournaments t
  where t.slug is null
)
update public.tournaments t
set slug = left(nullif(b.apelido,''), 30) || '-' || substr(md5(random()::text || t.id::text), 1, 4)
from base b
where t.id = b.id;

-- O resumo aceita o endereço novo e o código antigo, e devolve o código da
-- confirmação para o botão do fim da página funcionar nos dois casos.
create or replace function public.public_tournament_summary(p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  t record;
  gente json;
begin
  select tt.id, tt.name, tt.date, tt.location, tt.group_id,
         tt.has_churrasco, tt.confirm_code, tt.confirmations_open,
         coalesce(tt.capacity, gs.capacity) as vagas,
         g.name as grupo
    into t
  from public.tournaments tt
  join public.groups g on g.id = tt.group_id
  left join public.group_settings gs on gs.group_id = tt.group_id
  where (tt.slug is not null and tt.slug = p_code)
     or (tt.confirm_code is not null and tt.confirm_code = p_code);

  if t.id is null then
    return json_build_object('error', 'Jogo não encontrado.');
  end if;

  select coalesce(json_agg(json_build_object(
           'id', x.id,
           'nome', x.name,
           'convidado', x.is_guest,
           'status', x.status,
           'churrasco', x.churrasco,
           'dupla', x.partner_member_id
         ) order by x.name), '[]'::json)
    into gente
  from (
    select gm.id, gm.name, gm.is_guest,
           a.status, coalesce(a.churrasco, false) as churrasco,
           a.partner_member_id
    from public.group_members gm
    left join public.attendance a
      on a.member_id = gm.id and a.tournament_id = t.id
    where gm.group_id = t.group_id and gm.status = 'active'
  ) x;

  return json_build_object(
    'jogo', t.name,
    'grupo', t.grupo,
    'data', t.date,
    'local', t.location,
    'vagas', t.vagas,
    'tem_churrasco', t.has_churrasco,
    'codigo_confirmacao', case when t.confirmations_open then t.confirm_code else null end,
    'gente', gente
  );
end;
$$;

grant execute on function public.public_tournament_summary(text) to anon, authenticated;
