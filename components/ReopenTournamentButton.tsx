"use client";

import { useTransition } from "react";
import { reopenTournament } from "@/app/actions/tournaments";

export default function ReopenTournamentButton({
  groupId,
  tournamentId,
}: {
  groupId: string;
  tournamentId: string;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => {
        if (
          confirm(
            "Reabrir o torneio para corrigir placares? Ele volta para 'em andamento', você edita os resultados e depois é só encerrar de novo."
          )
        )
          start(() => reopenTournament(groupId, tournamentId));
      }}
      disabled={pending}
      className="btn-ghost w-full"
    >
      {pending ? "Reabrindo..." : "✏️ Reabrir para corrigir placares"}
    </button>
  );
}
