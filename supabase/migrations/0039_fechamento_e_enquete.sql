-- ============================================================
-- 0039: fechamento do mes e enquete do grupo.
-- ============================================================

-- ---------- Fechamento do mes ----------
-- O relatorio e sempre do momento atual: lancar uma despesa antiga muda o
-- passado. O fechamento congela os numeros do mes e vira prestacao de contas.
create table if not exists public.month_closings (
  id            uuid primary key default gen_random_uuid(),
  group_id      uuid not null references public.groups (id) on delete cascade,
  reference_month date not null,
  saldo_inicial numeric(10,2) not null default 0,
  entradas      numeric(10,2) not null default 0,
  saidas        numeric(10,2) not null default 0,
  saldo_final   numeric(10,2) not null default 0,
  nota          text,
  closed_by     uuid references public.profiles (id),
  closed_at     timestamptz not null default now(),
  unique (group_id, reference_month)
);

alter table public.month_closings enable row level security;

drop policy if exists month_closings_select on public.month_closings;
create policy month_closings_select on public.month_closings
  for select to authenticated using (public.is_group_member(group_id));

drop policy if exists month_closings_write on public.month_closings;
create policy month_closings_write on public.month_closings
  for all to authenticated
  using (public.is_group_admin(group_id)) with check (public.is_group_admin(group_id));

-- ---------- Enquete do grupo ----------
-- "Quem vai ser o destaque?" e "quem leva o pneu?" - cada um vota em um atleta.
create table if not exists public.polls (
  id            uuid primary key default gen_random_uuid(),
  group_id      uuid not null references public.groups (id) on delete cascade,
  tournament_id uuid references public.tournaments (id) on delete cascade,
  pergunta      text not null,
  aberta        boolean not null default true,
  created_by    uuid references public.profiles (id),
  created_at    timestamptz not null default now()
);

create index if not exists idx_polls_group on public.polls (group_id, created_at desc);

-- Um voto por pessoa por enquete: mudar de ideia troca o voto, nao soma outro.
create table if not exists public.poll_votes (
  poll_id    uuid not null references public.polls (id) on delete cascade,
  voter_id   uuid not null references public.group_members (id) on delete cascade,
  choice_id  uuid not null references public.group_members (id) on delete cascade,
  voted_at   timestamptz not null default now(),
  primary key (poll_id, voter_id)
);

alter table public.polls enable row level security;
alter table public.poll_votes enable row level security;

drop policy if exists polls_select on public.polls;
create policy polls_select on public.polls
  for select to authenticated using (public.is_group_member(group_id));

drop policy if exists polls_write on public.polls;
create policy polls_write on public.polls
  for all to authenticated
  using (public.is_group_admin(group_id)) with check (public.is_group_admin(group_id));

-- Todo mundo do grupo ve o resultado; cada um so mexe no proprio voto, e so
-- enquanto a enquete estiver aberta.
drop policy if exists poll_votes_select on public.poll_votes;
create policy poll_votes_select on public.poll_votes
  for select to authenticated using (
    exists (
      select 1 from public.polls p
      where p.id = poll_votes.poll_id and public.is_group_member(p.group_id)
    )
  );

drop policy if exists poll_votes_write on public.poll_votes;
create policy poll_votes_write on public.poll_votes
  for all to authenticated
  using (
    exists (
      select 1 from public.group_members gm
      where gm.id = poll_votes.voter_id and gm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.group_members gm
      join public.polls p on p.id = poll_votes.poll_id
      where gm.id = poll_votes.voter_id
        and gm.user_id = auth.uid()
        and gm.group_id = p.group_id
        and p.aberta
    )
  );
