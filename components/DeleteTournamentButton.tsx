"use client";

import { useTransition } from "react";
import { deleteTournament } from "@/app/actions/tournaments";

export default function DeleteTournamentButton({
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
            "Excluir este torneio? Duplas, jogos e resultados serão apagados. Não dá pra desfazer."
          )
        )
          start(() => deleteTournament(groupId, tournamentId));
      }}
      disabled={pending}
      className="rounded-lg px-3 py-2 text-sm font-semibold text-rose-500"
    >
      {pending ? "Excluindo..." : "🗑️ Excluir"}
    </button>
  );
}
