-- ============================================================
-- 0044: convidar pela lista de presenca sem depender de dupla.
--       O caminho que existia (public_add_guest_partner) exigia
--       o anfitriao estar sem par, o que travava quem so queria
--       trazer alguem.
-- ============================================================

create or replace function public.public_add_guest(
  p_code text,
  p_nome text,
  p_host uuid
) returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  t record;
  nome text;
  novo uuid;
  anfitriao uuid;
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

  nome := nullif(btrim(coalesce(p_nome, '')), '');
  if nome is null or length(nome) < 2 then
    return json_build_object('error', 'Escreva o nome do convidado.');
  end if;
  if length(nome) > 60 then
    return json_build_object('error', 'Nome muito longo.');
  end if;

  -- Quem esta trazendo tem que ser do grupo; sem isso o convidado fica solto e
  -- ninguem responde por ele na cobranca.
  if p_host is null or not exists (
    select 1 from public.group_members gm
    where gm.id = p_host and gm.group_id = t.group_id and gm.status = 'active'
  ) then
    return json_build_object('error', 'Diga quem está trazendo o convidado.');
  end if;
  anfitriao := p_host;

  insert into public.group_members (group_id, name, role, status, is_guest, invited_by)
  values (t.group_id, nome, 'player', 'active', true, anfitriao)
  returning id into novo;

  insert into public.attendance (group_id, tournament_id, member_id, status, updated_at)
  values (t.group_id, t.id, novo, 'yes', now());

  valor := coalesce(t.guest_fee, 0);
  quando := coalesce(t.data, current_date);
  if valor > 0 then
    insert into public.payments (group_id, member_id, amount, reference_month, due_date, status, tournament_id, kind)
    values (t.group_id, novo, valor, date_trunc('month', quando)::date, quando, 'pending', t.id, 'convidado');
  end if;

  return json_build_object('ok', true, 'nome', nome);
end;
$$;

grant execute on function public.public_add_guest(text, text, uuid) to anon, authenticated;
