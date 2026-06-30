import { getGroupContext } from "@/lib/data";
import { PageHeader, EmptyState } from "@/components/ui";
import ParticipantsPicker from "@/components/ParticipantsPicker";
import DrawButton from "@/components/DrawButton";
import MatchCard from "@/components/MatchCard";
import FinishButton from "@/components/FinishButton";
import { shortDate } from "@/lib/format";
import { notFound } from "next/navigation";

export default async function TournamentDetail({
  params,
}: {
  params: Promise<{ id: string; tid: string }>;
}) {
  const { id, tid } = await params;
  const { supabase, isAdmin } = await getGroupContext(id);

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", tid)
    .eq("group_id", id)
    .single();
  if (!tournament) notFound();

  const [{ data: members }, { data: participants }, { data: teams }, { data: matches }] =
    await Promise.all([
      supabase
        .from("group_members")
        .select("id, name, profile:profiles(id, full_name, avatar_url)")
        .eq("group_id", id)
        .eq("status", "active"),
      supabase
        .from("tournament_players")
        .select("member_id")
        .eq("tournament_id", tid),
      supabase
        .from("teams")
        .select(
          "id, name, seed, player1:group_members!teams_player1_member_fkey(id, name), player2:group_members!teams_player2_member_fkey(id, name)"
        )
        .eq("tournament_id", tid)
        .order("seed"),
      supabase
        .from("matches")
        .select("*, result:match_results(*)")
        .eq("tournament_id", tid)
        .order("play_order"),
    ]);

  const selectedIds = (participants ?? []).map((p) => p.member_id);
  const teamsById: Record<string, any> = {};
  for (const t of teams ?? []) teamsById[t.id] = t;

  const normMatches = (matches ?? []).map((m: any) => ({
    ...m,
    result: Array.isArray(m.result) ? m.result[0] ?? null : m.result,
  }));
  const hasMatches = normMatches.length > 0;

  const standings = computeStandings(normMatches, teamsById);

  return (
    <div className="space-y-6">
      <PageHeader
        title={tournament.name}
        subtitle={`${shortDate(tournament.date)}${
          tournament.location ? " • " + tournament.location : ""
        } • Set até ${tournament.game_format} games`}
        back={`/app/groups/${id}/tournaments`}
      />

      {isAdmin && tournament.status !== "finished" && (
        <ParticipantsPicker
          groupId={id}
          tournamentId={tid}
          members={members ?? []}
          selectedIds={selectedIds}
          locked={hasMatches}
        />
      )}

      {isAdmin && tournament.status !== "finished" && (
        <DrawButton
          groupId={id}
          tournamentId={tid}
          hasMatches={hasMatches}
          playerCount={selectedIds.length}
        />
      )}

      {hasMatches ? (
        <>
          {standings.length > 0 && (
            <section>
              <h3 className="mb-2 font-bold text-slate-800">📋 Classificação</h3>
              <div className="card !p-0">
                <table className="w-full text-sm">
                  <thead className="text-xs text-slate-400">
                    <tr className="border-b border-slate-100">
                      <th className="py-2 pl-4 text-left font-medium">Dupla</th>
                      <th className="px-1 font-medium">V</th>
                      <th className="px-1 font-medium">D</th>
                      <th className="px-1 font-medium">SG</th>
                      <th className="py-2 pr-4 font-medium">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((s, i) => (
                      <tr key={s.teamId} className="border-b border-slate-50 last:border-0">
                        <td className="py-2 pl-4 text-left">
                          <span className="mr-2 text-xs text-slate-400">{i + 1}</span>
                          {s.name}
                        </td>
                        <td className="px-1 text-center">{s.wins}</td>
                        <td className="px-1 text-center">{s.losses}</td>
                        <td className="px-1 text-center">{s.diff > 0 ? `+${s.diff}` : s.diff}</td>
                        <td className="py-2 pr-4 text-center font-bold text-court-600">{s.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section>
            <h3 className="mb-2 font-bold text-slate-800">🎾 Jogos</h3>
            <div className="space-y-3">
              {normMatches.map((m) => (
                <MatchCard
                  key={m.id}
                  groupId={id}
                  tournamentId={tid}
                  match={m}
                  teamsById={teamsById}
                  canEdit={isAdmin && tournament.status !== "finished"}
                  maxGames={tournament.game_format + (tournament.tie_break ? 1 : 0)}
                />
              ))}
            </div>
          </section>

          {isAdmin && tournament.status !== "finished" && (
            <FinishButton groupId={id} tournamentId={tid} />
          )}
        </>
      ) : (
        !isAdmin && (
          <EmptyState
            icon="⏳"
            title="Sorteio pendente"
            desc="O organizador ainda não sorteou as duplas deste torneio."
          />
        )
      )}
    </div>
  );
}

function computeStandings(matches: any[], teamsById: Record<string, any>) {
  const map: Record<
    string,
    { teamId: string; name: string; wins: number; losses: number; gf: number; ga: number }
  > = {};

  const nameOf = (t: any) => {
    if (!t) return "—";
    if (t.name) return t.name;
    const a = t.player1?.name?.split(" ")[0] || "?";
    const b = t.player2?.name?.split(" ")[0] || "?";
    return `${a} & ${b}`;
  };

  for (const m of matches) {
    if (!m.result || m.status !== "finished") continue;
    for (const tid of [m.team_a_id, m.team_b_id]) {
      if (tid && !map[tid])
        map[tid] = { teamId: tid, name: nameOf(teamsById[tid]), wins: 0, losses: 0, gf: 0, ga: 0 };
    }
    const ga = m.result.games_a;
    const gb = m.result.games_b;
    if (map[m.team_a_id]) {
      map[m.team_a_id].gf += ga;
      map[m.team_a_id].ga += gb;
    }
    if (map[m.team_b_id]) {
      map[m.team_b_id].gf += gb;
      map[m.team_b_id].ga += ga;
    }
    if (m.result.winner_team_id && map[m.result.winner_team_id]) {
      map[m.result.winner_team_id].wins++;
      const loser = m.result.winner_team_id === m.team_a_id ? m.team_b_id : m.team_a_id;
      if (map[loser]) map[loser].losses++;
    }
  }

  return Object.values(map)
    .map((s) => ({ ...s, diff: s.gf - s.ga, points: s.wins }))
    .sort((a, b) => b.points - a.points || b.diff - a.diff || b.wins - a.wins);
}
