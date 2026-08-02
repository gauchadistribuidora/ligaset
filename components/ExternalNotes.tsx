"use client";

import { useState, useTransition } from "react";
import { saveExternalNotes } from "@/app/actions/external";

// Observação sobre a performance no torneio. Pode ter sido escrita na hora de
// encerrar, ou acrescentada depois.
export default function ExternalNotes({
  tournamentId,
  notes,
}: {
  tournamentId: string;
  notes: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(notes ?? "");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!editing) {
    return (
      <div className="card">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-semibold text-slate-700">
            Minha performance
          </p>
          <button
            onClick={() => setEditing(true)}
            className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50"
          >
            {notes ? "Editar" : "Escrever"}
          </button>
        </div>
        <p className="mt-2 whitespace-pre-line text-sm text-slate-600">
          {notes || "Nada anotado sobre este torneio."}
        </p>
      </div>
    );
  }

  return (
    <div className="card space-y-3">
      <p className="text-sm font-semibold text-slate-700">Minha performance</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        autoFocus
        placeholder="Ex: saque melhorou muito, mas errei muita devolução no vento contra."
        className="input"
      />
      <div className="flex gap-2">
        <button
          disabled={pending}
          onClick={() => {
            setError(null);
            start(async () => {
              const res = await saveExternalNotes(tournamentId, text);
              if (res?.error) setError(res.error);
              else setEditing(false);
            });
          }}
          className="btn-primary flex-1"
        >
          {pending ? "Salvando..." : "Salvar"}
        </button>
        <button
          type="button"
          onClick={() => {
            setText(notes ?? "");
            setEditing(false);
          }}
          className="btn-ghost"
        >
          Cancelar
        </button>
      </div>
      {error && <p className="text-sm text-rose-500">{error}</p>}
    </div>
  );
}
