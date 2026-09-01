-- ============================================================
-- 0037: resumo do jogo em página aberta. Usa o mesmo código do
--       link de confirmação, mas é só leitura — e funciona mesmo
--       com a lista fechada, porque depois do jogo o resumo
--       continua valendo.
-- ============================================================

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
         tt.has_churrasco, coalesce(tt.capacity, gs.capacity) as vagas,
         g.name as grupo
    into t
  from public.tournaments tt
  join public.groups g on g.id = tt.group_id
  left join public.group_settings gs on gs.group_id = tt.group_id
  where tt.confirm_code is not null and tt.confirm_code = p_code;

  if t.id is null then
    return json_build_object('error', 'Jogo não encontrado.');
  end if;

  -- Só nome e situação: nenhuma informação de contato numa página aberta.
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
    'gente', gente
  );
end;
$$;

grant execute on function public.public_tournament_summary(text) to anon, authenticated;
