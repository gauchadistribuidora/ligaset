"use client";

import { useState, useTransition } from "react";
import { generateGroupsKnockout } from "@/app/actions/tournaments";

export default function GenerateKnockoutButton({
  groupId,
  tournamentId,
  hasKnockout,
  groupStageDone,
}: {
  groupId: string;
  tournamentId: string;
  hasKnockout: boolean;
  groupStageDone: boolean;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function run() {
    setMsg(null);
    start(async () => {
      const res = await generateGroupsKnockout(groupId, tournamentId);
      if (res?.error) setMsg(res.error);
    });
  }

  return (
    <div>
      <button
        onClick={() => {
          if (!hasKnockout || confirm("Refazer o mata-mata com os classificados atuais?"))
            run();
        }}
        disabled={pending || !groupStageDone}
        className="btn-dark w-full"
      >
        {pending
          ? "Gerando..."
          : hasKnockout
          ? "🔄 Refazer mata-mata"
          : "🏆 Gerar mata-mata dos classificados"}
      </button>
      {!groupStageDone && (
        <p className="mt-1 text-center text-xs text-slate-400">
          Conclua todos os jogos dos grupos para liberar o mata-mata.
        </p>
      )}
      {msg && <p className="mt-1 text-center text-xs text-rose-500">{msg}</p>}
    </div>
  );
}
