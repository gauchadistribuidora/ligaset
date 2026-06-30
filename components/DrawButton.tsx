"use client";

import { useState, useTransition } from "react";
import { drawTournament } from "@/app/actions/tournaments";

export default function DrawButton({
  groupId,
  tournamentId,
  hasMatches,
  playerCount,
}: {
  groupId: string;
  tournamentId: string;
  hasMatches: boolean;
  playerCount: number;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
        disabled={pending || playerCount < 4}
        className="btn-dark w-full"
      >
        {pending
          ? "Sorteando..."
          : hasMatches
          ? "🎲 Refazer sorteio"
          : "🎲 Sortear duplas e jogos"}
      </button>
      {playerCount < 4 && (
        <p className="mt-1 text-center text-xs text-slate-400">
          Selecione ao menos 4 jogadores.
        </p>
      )}
      {error && (
        <p className="mt-1 text-center text-sm text-rose-500">{error}</p>
      )}
    </div>
  );
}
