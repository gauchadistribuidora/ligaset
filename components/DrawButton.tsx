"use client";

import { useState, useTransition } from "react";
import { drawTournament } from "@/app/actions/tournaments";

export default function DrawButton({
  groupId,
  tournamentId,
  hasMatches,
  playerCount,
  format = "round_robin",
}: {
  groupId: string;
  tournamentId: string;
  hasMatches: boolean;
  playerCount: number;
  format?: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // No Simples não há duplas: bastam 3 atletas.
  const isSimples = format === "simples";
  const minPlayers = isSimples ? 3 : 4;

  function run() {
    if (
      hasMatches &&
      !confirm("Isso apaga o sorteio atual e os resultados. Continuar?")
    )
      return;
    setError(null);
    start(async () => {
      const res = await drawTournament(groupId, tournamentId);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div>
      <button
        onClick={run}
        disabled={pending || playerCount < minPlayers}
        className="btn-dark w-full"
      >
        {pending
          ? "Sorteando..."
          : hasMatches
          ? "🎲 Refazer sorteio"
          : isSimples
          ? "🎲 Sortear os jogos"
          : "🎲 Sortear duplas e jogos"}
      </button>
      {playerCount < minPlayers && (
        <p className="mt-1 text-center text-xs text-slate-400">
          Selecione ao menos {minPlayers} atletas.
        </p>
      )}
      {error && (
        <p className="mt-1 text-center text-sm text-rose-500">{error}</p>
      )}
    </div>
  );
}
