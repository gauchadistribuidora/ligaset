-- ============================================================
-- 0047: convidado so aparece no jogo em que ESTA DENTRO.
-- ============================================================
-- A 0046 dizia: convidado aparece se tem resposta no jogo. Nao bastou - 32
-- convidados de semanas passadas tinham resposta "nao", porque alguem foi
-- clicando "Nao" um a um para limpar a lista. Ter resposta virou justamente o
-- que os mantinha.
--
-- Regra certa: convidado so aparece no jogo em que ESTA DENTRO - confirmou
-- presenca ou marcou churrasco. Convidado que nao vem nao e assunto da lista.
-- Membro do grupo continua aparecendo sempre, respondendo ou nao.
--
-- Nada e apagado: as respostas antigas continuam no banco, e o financeiro
-- tambem. Para voltar atras, ver migrations 0032, 0038 e 0046.

create or replace function public.public_attendance_list(p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  t record;
  membros json;
  cap int;
begin
  select tt.id, tt.name, tt.date, tt.group_id, tt.confirmations_open,
         tt.has_churrasco,
         coalesce(tt.capacity, gs.capacity) as vagas, g.name as group_name
    into t
  from public.tournaments tt
  join public.groups g on g.id = tt.group_id
  left join public.group_settings gs on gs.group_id = tt.group_id
  where tt.confirm_code is not null and tt.confirm_code = p_code;

  if t.id is null then
    return json_build_object('error', 'Link inválido.');
  end if;
  if not t.confirmations_open then
    return json_build_object('error', 'A lista de presença deste jogo está fechada.');
  end if;

  cap := t.vagas;

  select coalesce(json_agg(x order by x.name), '[]'::json) into membros
  from (
    select gm.id, gm.name, gm.is_guest, a.status, a.updated_at,
           coalesce(a.churrasco, false) as churrasco,
           a.partner_member_id as partner_id,
           p.name as partner_name
    from public.group_members gm
    left join public.attendance a
      on a.member_id = gm.id and a.tournament_id = t.id
    left join public.group_members p on p.id = a.partner_member_id
    where gm.group_id = t.group_id and gm.status = 'active'
      and (
        not gm.is_guest
        or a.status = 'yes'
        or coalesce(a.churrasco, false)
      )
  ) x;

  return json_build_object(
    'tournament', json_build_object('name', t.name, 'date', t.date, 'group', t.group_name),
    'capacity', cap,
    'churrasco', t.has_churrasco,
    'members', membros
  );
end;
$$;

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
      and (
        not gm.is_guest
        or a.status = 'yes'
        or coalesce(a.churrasco, false)
      )
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

grant execute on function public.public_attendance_list(text) to anon, authenticated;
grant execute on function public.public_tournament_summary(text) to anon, authenticated;
