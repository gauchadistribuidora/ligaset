"use client";

import { useState, useTransition } from "react";
import { saveResult } from "@/app/actions/tournaments";

function teamName(team: any): string {
  if (!team) return "—";
  if (team.name) return team.name;
  const a = team.player1?.full_name?.split(" ")[0] || "?";
  const b = team.player2?.full_name?.split(" ")[0] || "?";
  return `${a} & ${b}`;
}

export default function MatchCard({
  groupId,
  tournamentId,
  match,
  teamsById,
  canEdit,
  maxGames,
}: {
  groupId: string;
  tournamentId: string;
  match: any;
  teamsById: Record<string, any>;
  canEdit: boolean;
  maxGames: number;
}) {
  const teamA = teamsById[match.team_a_id];
  const teamB = teamsById[match.team_b_id];
  const result = match.result;

  const [a, setA] = useState<number>(result?.games_a ?? 0);
  const [b, setB] = useState<number>(result?.games_b ?? 0);
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();

  const finished = match.status === "finished" && result;
  const winnerA = finished && result.winner_team_id === match.team_a_id;
  const winnerB = finished && result.winner_team_id === match.team_b_id;

  function save() {
    start(async () => {
      await saveResult(groupId, tournamentId, match.id, a, b);
      setEditing(false);
    });
  }

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
        <Row
          name={teamName(teamA)}
          score={result ? result.games_a : null}
          winner={winnerA}
        />
        <Row
          name={teamName(teamB)}
          score={result ? result.games_b : null}
          winner={winnerB}
        />
      </div>

      {canEdit && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          {editing ? (
            <div className="flex items-center justify-center gap-2">
              <Stepper value={a} setValue={setA} max={maxGames} />
              <span className="text-slate-300">x</span>
              <Stepper value={b} setValue={setB} max={maxGames} />
              <button
                onClick={save}
                disabled={pending || a === b}
                className="btn-primary !px-3 !py-2 text-xs"
              >
                {pending ? "..." : "Salvar"}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="w-full text-center text-sm font-semibold text-court-600"
            >
              {finished ? "Editar placar" : "Lançar placar"}
            </button>
          )}
          {editing && a === b && (
            <p className="mt-1 text-center text-xs text-rose-400">
              Placar não pode terminar empatado.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Row({
  name,
  score,
  winner,
}: {
  name: string;
  score: number | null;
  winner: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={`truncate ${winner ? "font-bold text-slate-900" : "text-slate-600"}`}>
        {winner && "🏆 "}
        {name}
      </span>
      <span
        className={`ml-2 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-sm font-bold ${
          winner ? "bg-court-500 text-white" : "bg-slate-100 text-slate-500"
        }`}
      >
        {score ?? "-"}
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
