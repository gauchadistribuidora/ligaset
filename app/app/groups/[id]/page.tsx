import Link from "next/link";
import { getGroupContext } from "@/lib/data";
import { Stat, Avatar } from "@/components/ui";
import { brl } from "@/lib/format";

export default async function GroupOverview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, group, isAdmin } = await getGroupContext(id);

  const [{ count: memberCount }, { count: tournamentCount }, { data: ranking }] =
    await Promise.all([
      supabase
        .from("group_members")
        .select("id", { count: "exact", head: true })
        .eq("group_id", id)
        .eq("status", "active"),
      supabase
        .from("tournaments")
        .select("id", { count: "exact", head: true })
        .eq("group_id", id),
      supabase
        .from("group_rankings")
        .select("*")
        .eq("group_id", id)
        .order("points", { ascending: false })
        .order("game_diff", { ascending: false })
        .limit(5),
    ]);

  // financeiro (apenas admin)
  let paid = 0,
    overdue = 0,
    received = 0;
  if (isAdmin) {
    const { data: pays } = await supabase
      .from("payments")
      .select("status, amount")
      .eq("group_id", id);
    for (const p of pays ?? []) {
      if (p.status === "paid") {
        paid++;
        received += Number(p.amount);
      }
      if (p.status === "overdue") overdue++;
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Jogadores ativos" value={memberCount ?? 0} />
        <Stat label="Torneios" value={tournamentCount ?? 0} />
        {isAdmin && (
          <>
            <Stat label="Mensalidades pagas" value={paid} hint={brl(received)} />
            <Stat label="Vencidas" value={overdue} />
          </>
        )}
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-bold text-slate-800">🏅 Top do ranking</h2>
          <Link
            href={`/app/groups/${id}/ranking`}
            className="text-sm font-semibold text-court-600"
          >
            Ver tudo
          </Link>
        </div>
        {ranking && ranking.length ? (
          <div className="card divide-y divide-slate-100 !p-0">
            {ranking.map((r: any, i: number) => (
              <div key={r.user_id} className="flex items-center gap-3 px-4 py-3">
                <span
                  className={`grid h-7 w-7 place-items-center rounded-full text-xs font-black ${
                    i === 0
                      ? "bg-amber-100 text-amber-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {i + 1}
                </span>
                <Avatar name={r.full_name} url={r.avatar_url} size={32} />
                <span className="flex-1 truncate font-semibold">
                  {r.full_name || "Jogador"}
                </span>
                <span className="text-sm font-bold text-court-600">
                  {r.points} pts
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-sm text-slate-500">
            Ainda sem jogos lançados. O ranking aparece quando os resultados
            forem registrados.
          </div>
        )}
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Link href={`/app/groups/${id}/tournaments`} className="card text-center">
          <div className="text-2xl">🏆</div>
          <div className="mt-1 text-sm font-bold">Torneios</div>
        </Link>
        <Link href={`/app/groups/${id}/members`} className="card text-center">
          <div className="text-2xl">👥</div>
          <div className="mt-1 text-sm font-bold">Membros</div>
        </Link>
      </section>
    </div>
  );
}
