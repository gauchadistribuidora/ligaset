"use client";

import { useTransition } from "react";
import { deleteMatchManual } from "@/app/actions/tournaments";

export default function MatchDeleteButton({
  groupId,
  tournamentId,
  matchId,
}: {
  groupId: string;
  tournamentId: string;
  matchId: string;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => {
        if (confirm("Remover este jogo?"))
          start(() => deleteMatchManual(groupId, tournamentId, matchId));
      }}
      disabled={pending}
      className="w-full text-center text-xs text-rose-400"
    >
      {pending ? "Removendo..." : "Remover jogo"}
    </button>
  );
}
