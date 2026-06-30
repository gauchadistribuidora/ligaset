import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Avatar, Stat } from "@/components/ui";
import { displayName, shortDate } from "@/lib/format";
import { Credit } from "@/components/Logo";

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

  // próximos torneios
  const { data: tournaments } = groupIds.length
    ? await supabase
        .from("tournaments")
        .select("id, name, date, group_id, status, groups(name, color)")
        .in("group_id", groupIds)
        .neq("status", "finished")
        .order("date", { ascending: true })
        .limit(4)
    : { data: [] as any[] };

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

      <section className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-bold text-slate-800">Próximos torneios</h2>
        </div>
        {tournaments && tournaments.length ? (
          <div className="space-y-2">
            {tournaments.map((t: any) => (
              <Link
                key={t.id}
                href={`/app/groups/${t.group_id}/tournaments/${t.id}`}
                className="card flex items-center justify-between !p-4"
              >
                <div>
                  <p className="font-semibold">{t.name}</p>
                  <p className="text-xs text-slate-500">
                    {t.groups?.name} • {shortDate(t.date)}
                  </p>
                </div>
                <span className="chip bg-ocean-900/5 text-ocean-900">
                  {t.status === "ongoing" ? "Em andamento" : "Agendado"}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="card text-sm text-slate-500">
            Nenhum torneio agendado.{" "}
            <Link href="/app/groups" className="font-semibold text-court-600">
              Crie um torneio
            </Link>
            .
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
      <div className="pt-3 pb-2"><Credit /></div>
    </div>
  );
}
