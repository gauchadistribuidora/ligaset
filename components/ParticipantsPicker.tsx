"use client";

import { useState, useTransition } from "react";
import { Avatar } from "@/components/ui";
import { togglePlayer } from "@/app/actions/tournaments";

export default function ParticipantsPicker({
  groupId,
  tournamentId,
  members,
  selectedIds,
  locked,
}: {
  groupId: string;
  tournamentId: string;
  members: any[];
  selectedIds: string[];
  locked: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedIds));
  const [pending, start] = useTransition();

  function toggle(userId: string) {
    if (locked) return;
    const add = !selected.has(userId);
    setSelected((prev) => {
      const next = new Set(prev);
      add ? next.add(userId) : next.delete(userId);
      return next;
    });
    start(() => togglePlayer(groupId, tournamentId, userId, add));
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-bold text-slate-800">
          Jogadores ({selected.size})
        </h3>
        {pending && <span className="text-xs text-slate-400">salvando...</span>}
      </div>
      <div className="card divide-y divide-slate-100 !p-0">
        {members.map((m) => {
          const p = m.profile;
          const on = selected.has(p.id);
          return (
            <button
              key={p.id}
              onClick={() => toggle(p.id)}
              disabled={locked}
              className="flex w-full items-center gap-3 px-4 py-3 text-left disabled:opacity-60"
            >
              <Avatar name={p.full_name} url={p.avatar_url} size={36} />
              <span className="flex-1 truncate font-medium">
                {p.full_name || "Jogador"}
              </span>
              <span
                className={`grid h-6 w-6 place-items-center rounded-full text-xs ${
                  on
                    ? "bg-court-500 text-white"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                {on ? "✓" : "+"}
              </span>
            </button>
          );
        })}
      </div>
      {locked && (
        <p className="mt-2 px-1 text-xs text-slate-400">
          Sorteio já realizado. Refaça o sorteio para alterar os participantes.
        </p>
      )}
    </div>
  );
}
