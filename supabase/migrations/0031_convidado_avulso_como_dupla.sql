-- ============================================================
-- 0031: levar alguém de fora. Quem confirma digita o nome e o
--       convidado entra na lista como dupla dele — sem conta,
--       sem login. Fica marcado como convidado e vinculado a
--       quem trouxe.
-- ============================================================

create or replace function public.public_add_guest_partner(
  p_code text,
  p_member uuid,
  p_nome text
) returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  t record;
  nome text;
  novo uuid;
  atual uuid;
  valor numeric;
  quando date;
begin
  select tt.id, tt.group_id, tt.confirmations_open, tt.date as data,
         gs.guest_fee
    into t
  from public.tournaments tt
  left join public.group_settings gs on gs.group_id = tt.group_id
  where tt.confirm_code is not null and tt.confirm_code = p_code;

  if t.id is null then
    return json_build_object('error', 'Link inválido.');
  end if;
  if not t.confirmations_open then
    return json_build_object('error', 'A lista deste jogo está fechada.');
  end if;

  if not exists (
    select 1 from public.group_members gm
    where gm.id = p_member and gm.group_id = t.group_id and gm.status = 'active'
  ) then
    return json_build_object('error', 'Atleta não é deste grupo.');
  end if;

  nome := nullif(btrim(coalesce(p_nome, '')), '');
  if nome is null or length(nome) < 2 then
    return json_build_object('error', 'Escreva o nome do convidado.');
  end if;
  if length(nome) > 60 then
    return json_build_object('error', 'Nome muito longo.');
  end if;

  -- Quem já tem dupla precisa desfazer antes — evita convidado órfão.
  select a.partner_member_id into atual
  from public.attendance a
  where a.tournament_id = t.id and a.member_id = p_member;

  if atual is not null then
    return json_build_object('error', 'Desfaça sua dupla atual antes de convidar alguém.');
  end if;

  insert into public.group_members (group_id, name, role, status, is_guest, invited_by)
  values (t.group_id, nome, 'player', 'active', true, p_member)
  returning id into novo;

  insert into public.attendance (group_id, tournament_id, member_id, status, partner_member_id, updated_at)
  values (t.group_id, t.id, p_member, 'yes', novo, now())
  on conflict (tournament_id, member_id)
  do update set status = 'yes', partner_member_id = novo, updated_at = now();

  insert into public.attendance (group_id, tournament_id, member_id, status, partner_member_id, updated_at)
  values (t.group_id, t.id, novo, 'yes', p_member, now());

  -- Mesma regra do outro caminho de convidado: cobrança da quadra, pendente
  -- até o administrador confirmar o Pix.
  valor := coalesce(t.guest_fee, 0);
  quando := coalesce(t.data, current_date);
  if valor > 0 then
    insert into public.payments (group_id, member_id, amount, reference_month, due_date, status, tournament_id)
    values (t.group_id, novo, valor, date_trunc('month', quando)::date, quando, 'pending', t.id);
  end if;

  return json_build_object('ok', true, 'id', novo, 'nome', nome);
end;
$$;

grant execute on function public.public_add_guest_partner(text, uuid, text) to anon, authenticated;

-- A lista pública passa a dizer quem é convidado (campo is_guest), para a tela
-- marcar embaixo do nome.
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
           a.partner_member_id as partner_id,
           p.name as partner_name
    from public.group_members gm
    left join public.attendance a
      on a.member_id = gm.id and a.tournament_id = t.id
    left join public.group_members p on p.id = a.partner_member_id
    where gm.group_id = t.group_id and gm.status = 'active'
  ) x;

  return json_build_object(
    'tournament', json_build_object('name', t.name, 'date', t.date, 'group', t.group_name),
    'capacity', cap,
    'members', membros
  );
end;
$$;

grant execute on function public.public_attendance_list(text) to anon, authenticated;
