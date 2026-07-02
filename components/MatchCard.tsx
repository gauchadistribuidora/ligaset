"use client";

import { useState, useTransition } from "react";
import { saveResult } from "@/app/actions/tournaments";

function teamName(team: any): string {
  if (!team) return "—";
  if (team.name) return team.name;
  const a = team.player1?.name?.split(" ")[0] || "?";
  const b = team.player2?.name?.split(" ")[0] || "?";
  return `${a} & ${b}`;
}

export default function MatchCard({
  groupId,
  tournamentId,
  match,
  teamsById,
  canEdit,
  maxGames,
  sets = 1,
}: {
  groupId: string;
  tournamentId: string;
  match: any;
  teamsById: Record<string, any>;
  canEdit: boolean;
  maxGames: number;
  sets?: number;
}) {
  const teamA = teamsById[match.team_a_id];
  const teamB = teamsById[match.team_b_id];
  const result = match.result;
  const multi = sets > 1;
  const ready = !!match.team_a_id && !!match.team_b_id;

  const initial: number[][] =
    result?.set_scores && Array.isArray(result.set_scores)
      ? result.set_scores
      : multi
      ? Array.from({ length: sets }, () => [0, 0])
      : [[result?.games_a ?? 0, result?.games_b ?? 0]];

  const [scores, setScores] = useState<number[][]>(initial);
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();

  const finished = match.status === "finished" && result;
  const winnerA = finished && result.winner_team_id === match.team_a_id;
  const winnerB = finished && result.winner_team_id === match.team_b_id;

  // placar exibido por set
  const shownA = result
    ? result.set_scores
      ? result.set_scores.map((s: number[]) => s[0])
      : [result.games_a]
    : null;
  const shownB = result
    ? result.set_scores
      ? result.set_scores.map((s: number[]) => s[1])
      : [result.games_b]
    : null;

  function setVal(setIdx: number, side: 0 | 1, val: number) {
    setScores((prev) => {
      const next = prev.map((s) => [...s]);
      next[setIdx][side] = val;
      return next;
    });
  }

  function save() {
    const totalA = scores.reduce((s, x) => s + x[0], 0);
    const totalB = scores.reduce((s, x) => s + x[1], 0);
    if (!multi) {
      start(async () => {
        await saveResult(groupId, tournamentId, match.id, scores[0][0], scores[0][1]);
        setEditing(false);
      });
      return;
    }
    let setsA = 0,
      setsB = 0;
    for (const [a, b] of scores) {
      if (a > b) setsA++;
      else if (b > a) setsB++;
    }
    const winner =
      setsA > setsB ? match.team_a_id : setsB > setsA ? match.team_b_id : null;
    start(async () => {
      await saveResult(
        groupId,
        tournamentId,
        match.id,
        totalA,
        totalB,
        scores,
        winner
      );
      setEditing(false);
    });
  }

  const tie = multi
    ? scores.filter((s) => s[0] > s[1]).length ===
      scores.filter((s) => s[1] > s[0]).length
    : scores[0][0] === scores[0][1];

  return (
    <div className="card !p-4">
      <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
        <span>
          {match.group_label ? `Grupo ${match.group_label} • ` : ""}Jogo{" "}
          {(match.play_order ?? 0) + 1}
        </span>
        {match.court && <span>Quadra {match.court}</span>}
      </div>

      <div className="space-y-1.5">
        <Row name={teamName(teamA)} scores={shownA} winner={winnerA} />
        <Row name={teamName(teamB)} scores={shownB} winner={winnerB} />
      </div>

      {canEdit && !ready && (
        <div className="mt-3 border-t border-slate-100 pt-3 text-center text-xs text-slate-400">
          Aguardando classificados
        </div>
      )}

      {canEdit && ready && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          {editing ? (
            <div className="space-y-2">
              {scores.map((s, i) => (
                <div key={i} className="flex items-center justify-center gap-2">
                  {multi && (
                    <span className="w-10 text-xs text-slate-400">Set {i + 1}</span>
                  )}
                  <Stepper value={s[0]} setValue={(v) => setVal(i, 0, v)} max={maxGames} />
                  <span className="text-slate-300">x</span>
                  <Stepper value={s[1]} setValue={(v) => setVal(i, 1, v)} max={maxGames} />
                </div>
              ))}
              <button
                onClick={save}
                disabled={pending || tie}
                className="btn-primary w-full !py-2 text-xs"
              >
                {pending ? "..." : "Salvar placar"}
              </button>
              {tie && (
                <p className="text-center text-xs text-rose-400">
                  {multi
                    ? "Defina um vencedor (sets desempatados)."
                    : "O placar não pode terminar empatado."}
                </p>
              )}
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="w-full text-center text-sm font-semibold text-court-600"
            >
              {finished ? "Editar placar" : "Lançar placar"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Row({
  name,
  scores,
  winner,
}: {
  name: string;
  scores: number[] | null;
  winner: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={`truncate ${winner ? "font-bold text-slate-900" : "text-slate-600"}`}>
        {winner && "🏆 "}
        {name}
      </span>
      <span className="ml-2 flex shrink-0 gap-1">
        {(scores ?? [null]).map((s, i) => (
          <span
            key={i}
            className={`grid h-7 w-7 place-items-center rounded-lg text-sm font-bold ${
              winner ? "bg-court-500 text-white" : "bg-slate-100 text-slate-500"
            }`}
          >
            {s ?? "-"}
          </span>
        ))}
      </span>
    </div>
  );
}

function Stepper({
  value,
  setValue,
  max,
}: {
  value: number;
  setValue: (n: number) => void;
  max: number;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => setValue(Math.max(0, value - 1))}
        className="h-8 w-8 rounded-lg bg-slate-100 font-bold text-slate-600"
      >
        −
      </button>
      <span className="w-7 text-center text-lg font-black">{value}</span>
      <button
        onClick={() => setValue(Math.min(max, value + 1))}
        className="h-8 w-8 rounded-lg bg-slate-100 font-bold text-slate-600"
      >
        +
      </button>
    </div>
  );
}
