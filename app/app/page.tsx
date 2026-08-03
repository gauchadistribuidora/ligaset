import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Avatar, Stat } from "@/components/ui";
import { isExternalTester } from "@/lib/admin";
import AgendaQuickAdd from "@/components/AgendaQuickAdd";
import NewTournamentChoice from "@/components/NewTournamentChoice";

// Bloquinho de data do mural: 15 / SET.
function dayMonth(d: string | null): { day: string; month: string } {
  if (!d) return { day: "–", month: "" };
  const date = new Date(d.length <= 10 ? d + "T00:00:00" : d);
  return {
    day: String(date.getDate()).padStart(2, "0"),
    month: date
      .toLocaleDateString("pt-BR", { month: "short" })
      .replace(".", "")
      .toUpperCase(),
  };
}

// Anotar é o caminho principal; criar o torneio completo fica discreto embaixo.
function AgendaFooter({ isTester }: { isTester: boolean }) {
  return (
    <div className="space-y-2 pt-1">
      <AgendaQuickAdd showFederated={isTester} />
      {isTester && (
        <div className="text-center">
          <NewTournamentChoice
            variant="link"
            label="ou criar o torneio completo"
            showFederated
          />
        </div>
      )}
    </div>
  );
}
import { displayName } from "@/lib/format";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single();

  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id, groups(id, name, color)")
    .eq("user_id", user!.id);

  const groupIds = (memberships ?? []).map((m) => m.group_id);

  // estatísticas pessoais agregadas (todas as views de ranking dos grupos)
  let wins = 0,
    games = 0,
    points = 0;
  if (groupIds.length) {
    const { data: rk } = await supabase
      .from("group_rankings")
      .select("wins, games_played, points")
      .eq("user_id", user!.id)
      .in("group_id", groupIds);
    for (const r of rk ?? []) {
      wins += r.wins ?? 0;
      games += r.games_played ?? 0;
      points += r.points ?? 0;
    }
  }

  // ---- agenda: junta os torneios das ligas com os federados do jogador ----
  const isTester = isExternalTester(user);

  const { data: tournaments } = groupIds.length
    ? await supabase
        .from("tournaments")
        .select("id, name, date, group_id, status, groups(name, color)")
        .in("group_id", groupIds)
        .neq("status", "finished")
        .order("date", { ascending: true })
        .limit(6)
    : { data: [] as any[] };

  const { data: federated } = isTester
    ? await supabase
        .from("external_tournaments")
        .select("id, name, tournament_date, federation, status")
        .eq("user_id", user!.id)
        .neq("status", "finished")
        .order("tournament_date", { ascending: true })
        .limit(6)
    : { data: [] as any[] };

  type AgendaItem = {
    id: string;
    href: string;
    name: string;
    meta: string;
    status: string;
    date: string | null;
  };

  const agenda: AgendaItem[] = [
    ...((tournaments ?? []) as any[]).map((t) => ({
      id: `g-${t.id}`,
      href: `/app/groups/${t.group_id}/tournaments/${t.id}`,
      name: t.name,
      meta: t.groups?.name ?? "Minha liga",
      status: t.status === "ongoing" ? "Em andamento" : "Agendado",
      date: t.date,
    })),
    ...((federated ?? []) as any[]).map((t) => ({
      id: `f-${t.id}`,
      href: `/app/externos/${t.id}`,
      name: t.name,
      meta: t.federation || "Federado",
      status: t.status === "ongoing" ? "Em andamento" : "Vou jogar",
      date: t.tournament_date,
    })),
  ]
    // Sem data vai para o fim — é torneio ainda sem dia marcado.
    .sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999"))
    .slice(0, 6);

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Avatar name={profile?.full_name} url={profile?.avatar_url} size={48} />
        <div>
          <p className="text-sm text-slate-500">Olá,</p>
          <h1 className="text-xl font-extrabold leading-tight">
            {displayName(profile)} 👋
          </h1>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Stat label="Vitórias" value={wins} />
        <Stat label="Jogos" value={games} />
        <Stat label="Pontos" value={points} />
      </div>

      {isTester && (
        <Link
          href="/app/externos"
          className="card mb-6 flex items-center justify-between !p-4"
        >
          <div>
            <p className="font-semibold">🎾 Torneios Federados</p>
            <p className="text-xs text-slate-500">
              Histórico e relatórios de torneios que não fazem parte do Ligaset —
              CBT, FGT, FGBT
            </p>
          </div>
          <span className="shrink-0 text-slate-300">›</span>
        </Link>
      )}

      <section className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-bold text-slate-800">Agenda de torneios</h2>
        </div>
        {agenda.length ? (
          <div className="space-y-2">
            {agenda.map((t) => {
              const d = dayMonth(t.date);
              return (
                <Link
                  key={t.id}
                  href={t.href}
                  className="card flex items-center gap-3 !p-3"
                >
                  <span className="grid h-12 w-12 shrink-0 place-content-center justify-items-center rounded-xl bg-ocean-900/5">
                    <span className="text-lg font-black leading-none text-ocean-900">
                      {d.day}
                    </span>
                    <span className="mt-0.5 text-[10px] font-bold uppercase leading-none text-slate-400">
                      {d.month}
                    </span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{t.name}</p>
                    <p className="truncate text-xs text-slate-500">{t.meta}</p>
                  </div>
                  <span className="chip shrink-0 bg-ocean-900/5 text-ocean-900">
                    {t.status}
                  </span>
                </Link>
              );
            })}
            <AgendaFooter isTester={isTester} />
          </div>
        ) : (
          <div className="card space-y-3 text-sm text-slate-500">
            <p>
              Nada marcado ainda. Anote os torneios que vêm por aí e eles ficam
              aqui no mural, à vista toda vez que você abrir o app.
            </p>
            <AgendaFooter isTester={isTester} />
          </div>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-bold text-slate-800">Meus grupos</h2>
          <Link href="/app/groups" className="text-sm font-semibold text-court-600">
            Ver todos
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
          {(memberships ?? []).map((m: any) => (
            <Link
              key={m.group_id}
              href={`/app/groups/${m.group_id}`}
              className="min-w-[140px] rounded-2xl p-4 text-white shadow-card"
              style={{ background: m.groups?.color || "#0c1b2a" }}
            >
              <div className="text-2xl font-black opacity-90">
                {m.groups?.name?.[0]?.toUpperCase()}
              </div>
              <div className="mt-6 text-sm font-bold leading-tight">
                {m.groups?.name}
              </div>
            </Link>
          ))}
          <Link
            href="/app/groups/new"
            className="grid min-w-[140px] place-items-center rounded-2xl border-2 border-dashed border-slate-300 p-4 text-slate-400"
          >
            <div className="text-center">
              <div className="text-2xl">＋</div>
              <div className="text-xs font-semibold">Novo grupo</div>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
