-- ============================================================
-- 0048: convidar de novo reaproveita o convidado que ja existe.
-- ============================================================
-- Convidar o mesmo nome criava OUTRA pessoa. Com a regra de "convidado so
-- aparece se confirmou" (0047), quem estava marcado como "nao" ficava
-- invisivel - e a tentativa de traze-lo de volta gerava cadastro repetido em
-- vez de reativa-lo. Resultado real no Cartel: 6 convidados repetidos, e o
-- Leonardo entrou duas vezes escrito de outro jeito sem nunca aparecer.
--
-- Agora, convidar alguem que ja existe no grupo REAPROVEITA o cadastro: mesma
-- pessoa, mesmo historico, mesma cobranca. So muda a resposta dele para
-- "confirmado" neste jogo. E a cobranca do jogo so entra se ainda nao existir.

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
  reaproveitado boolean := false;
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

  if p_host is null or not exists (
    select 1 from public.group_members gm
    where gm.id = p_host and gm.group_id = t.group_id and gm.status = 'active'
  ) then
    return json_build_object('error', 'Diga quem está trazendo o convidado.');
  end if;
  anfitriao := p_host;

  -- Ja existe convidado com esse nome no grupo? Reaproveita.
  select gm.id into novo
  from public.group_members gm
  where gm.group_id = t.group_id
    and gm.is_guest
    and gm.status = 'active'
    and lower(btrim(gm.name)) = lower(nome)
  order by gm.id
  limit 1;

  if novo is not null then
    reaproveitado := true;
    update public.group_members set invited_by = anfitriao where id = novo;
  else
    insert into public.group_members (group_id, name, role, status, is_guest, invited_by)
    values (t.group_id, nome, 'player', 'active', true, anfitriao)
    returning id into novo;
  end if;

  insert into public.attendance (group_id, tournament_id, member_id, status, updated_at)
  values (t.group_id, t.id, novo, 'yes', now())
  on conflict (tournament_id, member_id)
  do update set status = 'yes', updated_at = now();

  valor := coalesce(t.guest_fee, 0);
  quando := coalesce(t.data, current_date);
  if valor > 0 and not exists (
    select 1 from public.payments p
    where p.member_id = novo and p.tournament_id = t.id
  ) then
    insert into public.payments (group_id, member_id, amount, reference_month, due_date, status, tournament_id, kind)
    values (t.group_id, novo, valor, date_trunc('month', quando)::date, quando, 'pending', t.id, 'convidado');
  end if;

  return json_build_object('ok', true, 'nome', nome, 'reaproveitado', reaproveitado);
end;
$$;

grant execute on function public.public_add_guest(text, text, uuid) to anon, authenticated;
