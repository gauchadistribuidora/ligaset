"use client";

import { useTransition } from "react";
import { deleteExternalTournament } from "@/app/actions/external";

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
