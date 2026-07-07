import { getGroupContext } from "@/lib/data";
import { PageHeader, EmptyState } from "@/components/ui";
import ParticipantsPicker from "@/components/ParticipantsPicker";
import DrawButton from "@/components/DrawButton";
import MatchCard from "@/components/MatchCard";
import MatchDeleteButton from "@/components/MatchDeleteButton";
import FinishButton from "@/components/FinishButton";
import ManualBuilder from "@/components/ManualBuilder";
import DeleteTournamentButton from "@/components/DeleteTournamentButton";
import Bracket from "@/components/Bracket";
import GenerateKnockoutButton from "@/components/GenerateKnockoutButton";
import EditMatchTeams from "@/components/EditMatchTeams";
import { shortDate } from "@/lib/format";
import { notFound } from "next/navigation";

const FORMAT_LABEL: Record<string, string> = {
  round_robin: "Todos contra todos",
  rei_praia: "Rei da Praia",
  knockout: "Eliminatória direta",
  groups_ko: "Grupos + mata-mata",
  manual: "Manual",
};

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

  const format = tournament.format || "round_robin";
  const isManual = format === "manual";
  const isKnockout = format === "knockout";
  const isGroupsKo = format === "groups_ko";
  const isRei = format === "rei_praia";
  const canEdit = isAdmin && tournament.status !== "finished";
  const maxGames = tournament.game_format + (tournament.tie_break ? 1 : 0);
  const sets = tournament.sets ?? 1;

  const groupMatches = normMatches.filter((m: any) => m.phase !== "ko");
  const koMatches = normMatches.filter((m: any) => m.phase === "ko");

  // standings por grupo (grupos + mata-mata)
  const groupLabels = Array.from(
    new Set(groupMatches.map((m: any) => m.group_label || "A"))
  ).sort();
  const standingsByGroup = groupLabels.map((l) => ({
    label: l,
    standings: computeStandings(
      groupMatches.filter((m: any) => (m.group_label || "A") === l),
      teamsById
    ),
  }));
  const groupStageDone =
    groupMatches.length > 0 &&
    groupMatches.every((m: any) => m.status === "finished" && m.result);

  return (
    <div className="space-y-6">
      <PageHeader
        title={tournament.name}
        subtitle={`${FORMAT_LABEL[format] || "Torneio"} • ${shortDate(
          tournament.date
        )}${tournament.location ? " • " + tournament.location : ""} • Set até ${
          tournament.game_format
        } games`}
        back={`/app/groups/${id}/tournaments`}
        action={
          isAdmin ? (
            <DeleteTournamentButton groupId={id} tournamentId={tid} />
          ) : undefined
        }
      />

      {canEdit && !isManual && (
        <ParticipantsPicker
          groupId={id}
          tournamentId={tid}
          members={members ?? []}
          selectedIds={selectedIds}
          locked={hasMatches}
        />
      )}

      {canEdit && !isManual && (
        <DrawButton
          groupId={id}
          tournamentId={tid}
          hasMatches={hasMatches}
          playerCount={selectedIds.length}
        />
      )}

      {canEdit && isManual && (
        <ManualBuilder
          groupId={id}
          tournamentId={tid}
          members={members ?? []}
          teams={teams ?? []}
        />
      )}

      {hasMatches ? (
        <>
          {/* Eliminatória direta */}
          {isKnockout && (
            <Bracket
              matches={koMatches}
              teamsById={teamsById}
              groupId={id}
              tournamentId={tid}
              canEdit={canEdit}
              maxGames={maxGames}
              sets={sets}
            />
          )}

          {/* Grupos + mata-mata: fase de grupos */}
          {isGroupsKo && (
            <>
              {standingsByGroup.map(({ label, standings }) => (
                <StandingsCard key={label} title={`Grupo ${label}`} standings={standings} />
              ))}

              <section>
                <h3 className="mb-2 font-bold text-slate-800">🎾 Jogos dos grupos</h3>
                <div className="space-y-3">
                  {groupMatches.map((m: any) => (
                    <MatchCard
                      key={m.id}
                      groupId={id}
                      tournamentId={tid}
                      match={m}
                      teamsById={teamsById}
                      canEdit={canEdit}
                      maxGames={maxGames}
                      sets={sets}
                    />
                  ))}
                </div>
              </section>

              {canEdit && (
                <GenerateKnockoutButton
                  groupId={id}
                  tournamentId={tid}
                  hasKnockout={koMatches.length > 0}
                  groupStageDone={groupStageDone}
                />
              )}

              {koMatches.length > 0 && (
                <Bracket
                  matches={koMatches}
                  teamsById={teamsById}
                  groupId={id}
                  tournamentId={tid}
                  canEdit={canEdit}
                  maxGames={maxGames}
                  sets={sets}
                />
              )}
            </>
          )}

          {/* Rei da Praia (individual, rodízio) */}
          {isRei && (
            <>
              <IndividualStandingsCard
                standings={computeIndividualStandings(groupMatches, teamsById)}
                finished={tournament.status === "finished"}
              />

              {Array.from(
                new Set(groupMatches.map((m: any) => m.round ?? 1))
              )
                .sort((a, b) => (a as number) - (b as number))
                .map((rn) => (
                  <section key={rn as number}>
                    <h3 className="mb-2 font-bold text-slate-800">
                      🎾 Rodada {rn as number}
                    </h3>
                    <div className="space-y-3">
                      {groupMatches
                        .filter((m: any) => (m.round ?? 1) === rn)
                        .map((m: any) => (
                          <div key={m.id} className="space-y-1">
                            <MatchCard
                              groupId={id}
                              tournamentId={tid}
                              match={m}
                              teamsById={teamsById}
                              canEdit={canEdit}
                              maxGames={maxGames}
                              sets={sets}
                            />
                            {canEdit && (
                              <EditMatchTeams
                                groupId={id}
                                tournamentId={tid}
                                teamAId={m.team_a_id}
                                teamBId={m.team_b_id}
                                members={members ?? []}
                                a1={teamsById[m.team_a_id]?.player1?.id}
                                a2={teamsById[m.team_a_id]?.player2?.id}
                                b1={teamsById[m.team_b_id]?.player1?.id}
                                b2={teamsById[m.team_b_id]?.player2?.id}
                              />
                            )}
                          </div>
                        ))}
                    </div>
                  </section>
                ))}
            </>
          )}

          {/* Todos contra todos / manual */}
          {!isKnockout && !isGroupsKo && !isRei && (
            <>
              {(() => {
                const standings = computeStandings(groupMatches, teamsById);
                return standings.length > 0 ? (
                  <StandingsCard title="Classificação" standings={standings} />
                ) : null;
              })()}

              <section>
                <h3 className="mb-2 font-bold text-slate-800">🎾 Jogos</h3>
                <div className="space-y-3">
                  {groupMatches.map((m: any) => (
                    <div key={m.id} className="space-y-1">
                      <MatchCard
                        groupId={id}
                        tournamentId={tid}
                        match={m}
                        teamsById={teamsById}
                        canEdit={canEdit}
                        maxGames={maxGames}
                        sets={sets}
                      />
                      {canEdit && isManual && (
                        <MatchDeleteButton
                          groupId={id}
                          tournamentId={tid}
                          matchId={m.id}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {canEdit && <FinishButton groupId={id} tournamentId={tid} />}
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

function StandingsCard({
  title,
  standings,
}: {
  title: string;
  standings: ReturnType<typeof computeStandings>;
}) {
  if (standings.length === 0) return null;
  return (
    <section>
      <h3 className="mb-2 font-bold text-slate-800">📋 {title}</h3>
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

// ---------- Rei da Praia: ranking individual ----------

function computeIndividualStandings(matches: any[], teamsById: Record<string, any>) {
  const map: Record<
    string,
    { id: string; name: string; wins: number; losses: number; gf: number; ga: number }
  > = {};
  const h2h: Record<string, Record<string, number>> = {};

  const ensure = (p: any) => {
    if (p && p.id && !map[p.id])
      map[p.id] = { id: p.id, name: p.name || "Jogador", wins: 0, losses: 0, gf: 0, ga: 0 };
  };
  const bump = (a: string, b: string) => {
    h2h[a] = h2h[a] || {};
    h2h[a][b] = (h2h[a][b] || 0) + 1;
  };

  for (const m of matches) {
    if (!m.result || m.status !== "finished") continue;
    const tA = teamsById[m.team_a_id];
    const tB = teamsById[m.team_b_id];
    if (!tA || !tB) continue;
    const A = [tA.player1, tA.player2].filter(Boolean);
    const B = [tB.player1, tB.player2].filter(Boolean);
    A.forEach(ensure);
    B.forEach(ensure);

    const ga = m.result.games_a;
    const gb = m.result.games_b;
    const winA = m.result.winner_team_id === m.team_a_id;
    const winB = m.result.winner_team_id === m.team_b_id;

    for (const p of A) {
      map[p.id].gf += ga;
      map[p.id].ga += gb;
      if (winA) map[p.id].wins++;
      else if (winB) map[p.id].losses++;
    }
    for (const p of B) {
      map[p.id].gf += gb;
      map[p.id].ga += ga;
      if (winB) map[p.id].wins++;
      else if (winA) map[p.id].losses++;
    }

    if (winA) for (const a of A) for (const b of B) bump(a.id, b.id);
    else if (winB) for (const b of B) for (const a of A) bump(b.id, a.id);
  }

  return Object.values(map)
    .map((s) => ({ ...s, diff: s.gf - s.ga }))
    .sort(
      (x, y) =>
        y.wins - x.wins ||
        y.diff - x.diff ||
        (h2h[y.id]?.[x.id] || 0) - (h2h[x.id]?.[y.id] || 0)
    );
}

function IndividualStandingsCard({
  standings,
  finished,
}: {
  standings: ReturnType<typeof computeIndividualStandings>;
  finished: boolean;
}) {
  if (standings.length === 0) {
    return (
      <div className="card text-sm text-slate-500">
        Lance os placares das rodadas para ver o ranking individual.
      </div>
    );
  }
  return (
    <section>
      <h3 className="mb-2 font-bold text-slate-800">👑 Ranking individual</h3>
      <div className="card !p-0">
        <table className="w-full text-sm">
          <thead className="text-xs text-slate-400">
            <tr className="border-b border-slate-100">
              <th className="py-2 pl-3 text-left font-medium">#</th>
              <th className="text-left font-medium">Atleta</th>
              <th className="px-1 font-medium">V</th>
              <th className="px-1 font-medium">D</th>
              <th className="px-1 font-medium">SG</th>
              <th className="py-2 pr-3 font-medium">Games</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, i) => (
              <tr key={s.id} className="border-b border-slate-50 last:border-0">
                <td className="py-2.5 pl-3 text-slate-400">{i + 1}</td>
                <td className="font-semibold text-slate-800">
                  {i === 0 && "👑 "}
                  {s.name}
                  {i === 0 && finished && (
                    <span className="ml-1 text-xs font-normal text-amber-600">
                      Rei da Praia
                    </span>
                  )}
                </td>
                <td className="px-1 text-center font-semibold text-court-600">{s.wins}</td>
                <td className="px-1 text-center text-rose-500">{s.losses}</td>
                <td className="px-1 text-center text-slate-500">
                  {s.diff > 0 ? `+${s.diff}` : s.diff}
                </td>
                <td className="py-2.5 pr-3 text-center text-slate-500">{s.gf}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-1 pt-1 text-xs text-slate-400">
        Critério: vitórias, depois saldo de games (SG), depois confronto direto.
      </p>
    </section>
  );
}
