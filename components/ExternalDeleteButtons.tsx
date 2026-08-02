"use client";

import { useTransition } from "react";
import {
  deleteExternalMatch,
  deleteExternalTournament,
} from "@/app/actions/external";

export function DeleteExternalMatchButton({
  tournamentId,
  matchId,
}: {
  tournamentId: string;
  matchId: string;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      title="Excluir jogo"
      onClick={() => {
        if (confirm("Excluir este jogo?"))
          start(async () => {
            await deleteExternalMatch(tournamentId, matchId);
          });
      }}
      className="shrink-0 rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-rose-50 hover:text-rose-500"
    >
      Excluir
    </button>
  );
}

export function DeleteExternalTournamentButton({
  tournamentId,
}: {
  tournamentId: string;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => {
        if (confirm("Excluir o torneio e todos os jogos lançados nele?"))
          start(async () => {
            await deleteExternalTournament(tournamentId);
          });
      }}
      className="btn-danger w-full"
    >
      {pending ? "Excluindo..." : "Excluir torneio"}
    </button>
  );
}
