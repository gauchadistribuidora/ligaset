"use client";

import { useState, useTransition } from "react";
import { setPneuEditor } from "@/app/actions/pneus";

type Member = { id: string; name: string | null; can_manage_pneu?: boolean };

// Quem, além do dono, pode lançar e corrigir pneus.
export default function PneuEditors({
  groupId,
  members,
}: {
  groupId: string;
  members: Member[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const autorizados = members.filter((m) => m.can_manage_pneu).length;

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-ghost w-full">
        🔑 Quem pode lançar pneu ({autorizados})
      </button>
    );
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-700">
            Quem pode lançar pneu
          </p>
          <p className="text-xs text-slate-500">
            Você e os administradores já podem. Marque quem mais pode lançar e
            corrigir.
          </p>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="shrink-0 text-xs font-semibold text-slate-400 hover:text-slate-600"
        >
          Fechar
        </button>
      </div>

      <div className="divide-y divide-slate-50">
        {members.map((m) => (
          <label
            key={m.id}
            className="flex cursor-pointer items-center gap-3 py-2"
          >
            <input
              type="checkbox"
              disabled={pending}
              defaultChecked={!!m.can_manage_pneu}
              onChange={(e) => {
                const allowed = e.target.checked;
                setError(null);
                start(async () => {
                  const res = await setPneuEditor(groupId, m.id, allowed);
                  if (res?.error) setError(res.error);
                });
              }}
              className="h-5 w-5 shrink-0 rounded accent-court-500"
            />
            <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
              {m.name ?? "Sem nome"}
            </span>
          </label>
        ))}
      </div>

      {error && <p className="text-sm text-rose-500">{error}</p>}
    </div>
  );
}
