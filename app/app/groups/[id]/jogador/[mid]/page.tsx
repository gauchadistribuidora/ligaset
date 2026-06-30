import { getGroupContext } from "@/lib/data";
import { PageHeader, Avatar, Stat, EmptyState } from "@/components/ui";
import { notFound } from "next/navigation";

export default async function PlayerHistory({
  params,
}: {
  params: Promise<{ id: string; mid: string }>;
}) {
  const { id, mid } = await params;
  const { supabase } = await getGroupContext(id);

  const { data: member } = await supabase
    .from("group_members")
    .select("id, name, avatar_url, profile:profiles(full_name, avatar_url)")
    .eq("id", mid)
    .eq("group_id", id)
    .maybeSingle();
  if (!member) notFound();
  const prof: any = Array.isArray((member as any).profile)
    ? (member as any).profile[0]
    : (member as any).profile;

  const memberName = member.name || prof?.full_name || "Jogador";

  const { data: gms } = await supabase
    .from("group_members")
    .select("id, name")
    .eq("group_id", id);
  const nameMap: Record<string, string> = {};
  for (const g of gms ?? []) nameMap[g.id] = g.name || "Jogador";

  const { data: tours } = await supabase
    .from("tournaments")
    .select("id")
    .eq("group_id", id);
  const tids = (tours ?? []).map((t) => t.id);

  let games = 0,
    wins = 0,
    losses = 0;
  const partners: Record<string, { wins: number; games: number }> = {};
  const rivals: Record<string, number> = {};
  const streakSeq: boolean[] = [];

  if (tids.length) {
    const { data: teams } = await supabase
      .from("teams")
      .select("id, player1_id, player2_id")
      .in("tournament_id", tids);
    const teamMap: Record<string, any> = {};
    for (const t of teams ?? []) teamMap[t.id] = t;

    const { data: matches } = await supabase
      .from("matches")
      .select(
        "id, team_a_id, team_b_id, status, play_order, created_at, result:match_results(winner_team_id)"
      )
      .in("tournament_id", tids)
      .eq("status", "finished")
      .order("created_at", { ascending: true });

    for (const m of matches ?? []) {
      const res = Array.isArray(m.result) ? m.result[0] : m.result;
      if (!res) continue;
      const tA = teamMap[m.team_a_id];
      const tB = teamMap[m.team_b_id];
      if (!tA || !tB) continue;
      let mine: any = null,
        opp: any = null,
        myTeamId = "";
      if (tA.player1_id === mid || tA.player2_id === mid) {
        mine = tA;
        opp = tB;
        myTeamId = m.team_a_id;
      } else if (tB.player1_id === mid || tB.player2_id === mid) {
        mine = tB;
        opp = tA;
        myTeamId = m.team_b_id;
      } else continue;

      games++;
      const won = res.winner_team_id === myTeamId;
      if (won) wins++;
      else losses++;
      streakSeq.push(won);

      const partnerId = mine.player1_id === mid ? mine.player2_id : mine.player1_id;
      if (partnerId) {
        partners[partnerId] ??= { wins: 0, games: 0 };
        partners[partnerId].games++;
        if (won) partners[partnerId].wins++;
      }
      for (const oid of [opp.player1_id, opp.player2_id]) {
        if (oid) rivals[oid] = (rivals[oid] || 0) + 1;
      }
    }
  }

  const pct = games ? Math.round((100 * wins) / games) : 0;

  // sequência atual (vitórias seguidas a partir do fim)
  let streak = 0;
  for (let i = streakSeq.length - 1; i >= 0; i--) {
    if (streakSeq[i]) streak++;
    else break;
  }

  const bestPartner = Object.entries(partners).sort(
    (a, b) => b[1].wins - a[1].wins || b[1].games - a[1].games
  )[0];
  const topRival = Object.entries(rivals).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="space-y-6">
      <PageHeader title="Histórico" back={`/app/groups/${id}/ranking`} />

      <div className="card flex items-center gap-4">
        <Avatar name={memberName} url={(member as any).avatar_url || prof?.avatar_url} size={56} />
        <div>
          <p className="text-lg font-extrabold">{memberName}</p>
          <p className="text-sm text-slate-400">
            {games} jogo(s) neste grupo
          </p>
        </div>
      </div>

      {games === 0 ? (
        <EmptyState
          icon="📭"
          title="Sem jogos ainda"
          desc="Quando este jogador disputar partidas, o histórico aparece aqui."
        />
      ) : (
        <>
          <div className="grid grid-cols-4 gap-2">
            <Stat label="Jogos" value={games} />
            <Stat label="Vitórias" value={wins} />
            <Stat label="Derrotas" value={losses} />
            <Stat label="Aprov." value={`${pct}%`} />
          </div>

          <div className="space-y-3">
            <InfoCard
              icon="🔥"
              label="Sequência atual"
              value={streak > 0 ? `${streak} vitória(s) seguidas` : "Sem sequência"}
            />
            <InfoCard
              icon="🤝"
              label="Melhor parceiro"
              value={
                bestPartner
                  ? `${nameMap[bestPartner[0]] || "—"} (${bestPartner[1].wins}V em ${bestPartner[1].games})`
                  : "—"
              }
            />
            <InfoCard
              icon="⚔️"
              label="Maior rival"
              value={
                topRival
                  ? `${nameMap[topRival[0]] || "—"} (${topRival[1]} confronto(s))`
                  : "—"
              }
            />
          </div>
        </>
      )}
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="card flex items-center gap-3 !py-4">
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}
