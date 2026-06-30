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

  function toggle(memberId: string) {
    if (locked) return;
    const add = !selected.has(memberId);
    setSelected((prev) => {
      const next = new Set(prev);
      add ? next.add(memberId) : next.delete(memberId);
      return next;
    });
    start(() => togglePlayer(groupId, tournamentId, memberId, add));
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-bold text-slate-800">Jogadores ({selected.size})</h3>
        {pending && <span className="text-xs text-slate-400">salvando...</span>}
      </div>
      <div className="card divide-y divide-slate-100 !p-0">
        {members.map((m) => {
          const name = m.name || m.profile?.full_name || "Jogador";
          const on = selected.has(m.id);
          return (
            <button
              key={m.id}
              onClick={() => toggle(m.id)}
              disabled={locked}
              className="flex w-full items-center gap-3 px-4 py-3 text-left disabled:opacity-60"
            >
              <Avatar name={name} url={m.profile?.avatar_url} size={36} />
              <span className="flex-1 truncate font-medium">{name}</span>
              <span
                className={`grid h-6 w-6 place-items-center rounded-full text-xs ${
                  on ? "bg-court-500 text-white" : "bg-slate-100 text-slate-400"
                }`}
              >
                {on ? "✓" : "+"}
              </span>
            </button>
          );
        })}
      </div>
      {members.length === 0 && (
        <p className="mt-2 px-1 text-xs text-slate-400">
          Nenhum jogador no grupo ainda. Cadastre jogadores na aba Membros.
        </p>
      )}
      {locked && (
        <p className="mt-2 px-1 text-xs text-slate-400">
          Sorteio já realizado. Refaça o sorteio para alterar os participantes.
        </p>
      )}
    </div>
  );
}
