import { getGroupContext } from "@/lib/data";
import { Avatar, EmptyState } from "@/components/ui";

export default async function RankingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await getGroupContext(id);

  const { data: ranking } = await supabase
    .from("group_rankings")
    .select("*")
    .eq("group_id", id)
    .order("points", { ascending: false })
    .order("game_diff", { ascending: false })
    .order("wins", { ascending: false });

  if (!ranking || ranking.length === 0) {
    return (
      <EmptyState
        icon="📊"
        title="Ranking vazio"
        desc="O ranking é gerado automaticamente a partir dos resultados dos torneios. Lance alguns jogos para começar."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="card !p-0">
        <table className="w-full text-sm">
          <thead className="text-xs text-slate-400">
            <tr className="border-b border-slate-100">
              <th className="py-3 pl-4 text-left font-medium">#</th>
              <th className="text-left font-medium">Jogador</th>
              <th className="px-1 font-medium">J</th>
              <th className="px-1 font-medium">V</th>
              <th className="px-1 font-medium">%</th>
              <th className="py-3 pr-4 font-medium">Pts</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((r: any, i: number) => (
              <tr key={r.user_id} className="border-b border-slate-50 last:border-0">
                <td className="py-2.5 pl-4">
                  <span
                    className={`grid h-6 w-6 place-items-center rounded-full text-xs font-black ${
                      i === 0
                        ? "bg-amber-100 text-amber-700"
                        : i === 1
                        ? "bg-slate-200 text-slate-600"
                        : i === 2
                        ? "bg-orange-100 text-orange-700"
                        : "bg-slate-50 text-slate-400"
                    }`}
                  >
                    {i + 1}
                  </span>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <Avatar name={r.full_name} url={r.avatar_url} size={28} />
                    <span className="truncate font-semibold">
                      {r.full_name || "Jogador"}
                    </span>
                  </div>
                </td>
                <td className="px-1 text-center text-slate-500">{r.games_played}</td>
                <td className="px-1 text-center text-slate-500">{r.wins}</td>
                <td className="px-1 text-center text-slate-500">{r.win_pct}%</td>
                <td className="py-2.5 pr-4 text-center font-bold text-court-600">
                  {r.points}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-1 text-xs text-slate-400">
        Pontuação: vitória = 1 ponto. Critérios de desempate: pontos, saldo de
        games e número de vitórias.
      </p>
    </div>
  );
}
