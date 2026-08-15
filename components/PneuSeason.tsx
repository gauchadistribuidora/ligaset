"use client";

import { useState, useTransition } from "react";
import { closePneuSeason, deletePneuSeason } from "@/app/actions/pneus";

// Troféu da temporada: congela quem levou mais pneu no período e vira história.
export default function PneuSeason({ groupId }: { groupId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok?: boolean; error?: string } | null>(null);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-ghost w-full">
        🏆 Fechar temporada do pneu
      </button>
    );
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-slate-700">Fechar temporada</p>
        <button
          onClick={() => setOpen(false)}
          className="shrink-0 text-xs font-semibold text-slate-400 hover:text-slate-600"
        >
          Fechar
        </button>
      </div>

      <form
        id="season-form"
        action={(formData) => {
          setMsg(null);
          start(async () => {
            const res = await closePneuSeason(groupId, formData);
            setMsg(res ?? null);
            if (res?.ok)
              (document.getElementById("season-form") as HTMLFormElement)?.reset();
          });
        }}
        className="space-y-3"
      >
        <div>
          <label className="label">Nome da temporada</label>
          <input name="label" required placeholder="Ex: 2026" className="input" />
        </div>
        <div>
          <label className="label">Contar a partir de</label>
          <input name="from" type="date" className="input" />
          <p className="mt-1 text-xs text-slate-400">
            Em branco, conta todos os pneus já lançados.
          </p>
        </div>
        <button disabled={pending} className="btn-primary w-full">
          {pending ? "Fechando..." : "Coroar o campeão do pneu"}
        </button>
      </form>

      {msg?.error && <p className="text-sm text-rose-500">{msg.error}</p>}
      {msg?.ok && (
        <p className="text-sm text-court-600">Temporada fechada! 🏆</p>
      )}
    </div>
  );
}

export function SeasonRow({
  groupId,
  season,
  canManage,
}: {
  groupId: string;
  season: {
    id: string;
    label: string;
    total: number;
    closed_on: string;
    member?: { name: string | null } | null;
  };
  canManage: boolean;
}) {
  const [pending, start] = useTransition();

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="text-xl">🏆</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800">
          Pneu de {season.label}: {season.member?.name ?? "—"}
        </p>
        <p className="text-xs text-slate-400">
          {season.total} pneu(s) ·{" "}
          {new Date(season.closed_on + "T00:00:00").toLocaleDateString("pt-BR")}
        </p>
      </div>
      {canManage && (
        <button
          disabled={pending}
          onClick={() => {
            if (confirm("Apagar este troféu?"))
              start(async () => {
                await deletePneuSeason(groupId, season.id);
              });
          }}
          className="shrink-0 rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-rose-50 hover:text-rose-500"
        >
          Apagar
        </button>
      )}
    </div>
  );
}
