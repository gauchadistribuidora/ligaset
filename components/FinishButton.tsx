"use client";

import { useTransition } from "react";
import { finishTournament } from "@/app/actions/tournaments";

export default function FinishButton({
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
        if (confirm("Encerrar o torneio? O ranking do grupo será consolidado."))
          start(() => finishTournament(groupId, tournamentId));
      }}
      disabled={pending}
      className="btn-ghost w-full"
    >
      {pending ? "Encerrando..." : "🏁 Encerrar torneio"}
    </button>
  );
}
