-- ============================================================
-- 0043: convidado entra so com o nome. O convite exigia criar
--       conta; para quem vai jogar uma vez, isso trava.
-- ============================================================

create or replace function public.public_join_invite(
  p_code text,
  p_nome text,
  p_host uuid
) returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  inv record;
  nome text;
  novo uuid;
  anfitriao uuid;
  valor numeric;
  quando date;
begin
  select gi.group_id, gi.tournament_id, gi.invited_by,
         gs.guest_fee, t.date as data, t.confirmations_open
    into inv
  from public.guest_invites gi
  left join public.group_settings gs on gs.group_id = gi.group_id
  left join public.tournaments t on t.id = gi.tournament_id
  where gi.code = p_code;

  if inv.group_id is null then
    return json_build_object('error', 'Convite inválido ou expirado.');
  end if;
  if inv.tournament_id is not null and not coalesce(inv.confirmations_open, false) then
    return json_build_object('error', 'A lista deste jogo está fechada.');
  end if;

  nome := nullif(btrim(coalesce(p_nome, '')), '');
  if nome is null or length(nome) < 2 then
    return json_build_object('error', 'Escreva o seu nome.');
  end if;
  if length(nome) > 60 then
    return json_build_object('error', 'Nome muito longo.');
  end if;

  -- O anfitriao informado tem que ser do mesmo grupo; sem ele, fica quem gerou.
  if p_host is not null and exists (
    select 1 from public.group_members gm
    where gm.id = p_host and gm.group_id = inv.group_id
  ) then
    anfitriao := p_host;
  else
    anfitriao := inv.invited_by;
  end if;

  insert into public.group_members (group_id, name, role, status, is_guest, invited_by)
  values (inv.group_id, nome, 'player', 'active', true, anfitriao)
  returning id into novo;

  if inv.tournament_id is not null then
    insert into public.attendance (group_id, tournament_id, member_id, status, updated_at)
    values (inv.group_id, inv.tournament_id, novo, 'yes', now());
  end if;

  -- Mesma cobranca dos outros caminhos de convidado: pendente ate o
  -- administrador confirmar o Pix.
  valor := coalesce(inv.guest_fee, 0);
  quando := coalesce(inv.data, current_date);
  if valor > 0 and inv.tournament_id is not null then
    insert into public.payments (group_id, member_id, amount, reference_month, due_date, status, tournament_id, kind)
    values (inv.group_id, novo, valor, date_trunc('month', quando)::date, quando, 'pending', inv.tournament_id, 'convidado');
  end if;

  return json_build_object('ok', true, 'nome', nome);
end;
$$;

grant execute on function public.public_join_invite(text, text, uuid) to anon, authenticated;
