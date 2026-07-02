import MatchCard from "@/components/MatchCard";
import { roundLabel } from "@/lib/bracket";

export default function Bracket({
  matches,
  teamsById,
  groupId,
  tournamentId,
  canEdit,
  maxGames,
  sets = 1,
}: {
  matches: any[];
  teamsById: Record<string, any>;
  groupId: string;
  tournamentId: string;
  canEdit: boolean;
  maxGames: number;
  sets?: number;
}) {
  const ko = matches
    .filter((m) => m.phase === "ko")
    .sort((a, b) => (a.round ?? 0) - (b.round ?? 0) || (a.slot ?? 0) - (b.slot ?? 0));
  if (ko.length === 0) return null;

  const rounds: Record<number, any[]> = {};
  for (const m of ko) (rounds[m.round ?? 1] ??= []).push(m);
  const roundNums = Object.keys(rounds)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <section>
      <h3 className="mb-2 font-bold text-slate-800">🏆 Chave (mata-mata)</h3>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {roundNums.map((rn) => (
          <div key={rn} className="min-w-[230px] flex-1 space-y-3">
            <p className="text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
              {roundLabel(rounds[rn].length)}
            </p>
            <div className="flex h-full flex-col justify-around gap-3">
              {rounds[rn].map((m) => (
                <MatchCard
                  key={m.id}
                  groupId={groupId}
                  tournamentId={tournamentId}
                  match={m}
                  teamsById={teamsById}
                  canEdit={canEdit}
                  maxGames={maxGames}
                  sets={sets}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
