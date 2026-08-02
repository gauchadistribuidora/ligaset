"use client";

import { useState, useTransition } from "react";
import {
  advanceExternalPhase,
  eliminateExternal,
  reopenExternalTournament,
  startExternalTournament,
} from "@/app/actions/external";

// Os dois botões que fecham a fase: é aqui que o histórico do torneio
// se resolve sozinho, sem a jogadora precisar dizer "cheguei na semi".
export default function ExternalOutcome({
  tournamentId,
  nextPhaseLabel,
}: {
  tournamentId: string;
  nextPhaseLabel: string | null;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="card space-y-3">
      <p className="text-sm font-semibold text-slate-700">E aí, como terminou?</p>
      <div className="grid gap-2">
        {nextPhaseLabel && (
          <button
            disabled={pending}
            onClick={() => {
              setError(null);
              start(async () => {
                const res = await advanceExternalPhase(tournamentId);
                if (res?.error) setError(res.error);
              });
            }}
            className="btn-primary w-full"
          >
            ✅ Avançou para {nextPhaseLabel}
          </button>
        )}
        <button
          disabled={pending}
          onClick={() => {
            if (!confirm("Encerrar o torneio nesta fase?")) return;
            setError(null);
            start(async () => {
              const res = await eliminateExternal(tournamentId);
              if (res?.error) setError(res.error);
            });
          }}
          className="btn-ghost w-full"
        >
          ❌ Foi eliminada aqui
        </button>
      </div>
      {error && <p className="text-sm text-rose-500">{error}</p>}
    </div>
  );
}

export function StartExternalButton({ tournamentId }: { tournamentId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() =>
        start(async () => {
          await startExternalTournament(tournamentId);
        })
      }
      className="btn-primary w-full"
    >
      {pending ? "Começando..." : "🎾 Começar torneio"}
    </button>
  );
}

export function ReopenExternalButton({ tournamentId }: { tournamentId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() =>
        start(async () => {
          await reopenExternalTournament(tournamentId);
        })
      }
      className="btn-ghost w-full"
    >
      {pending ? "Reabrindo..." : "↩️ Reabrir torneio"}
    </button>
  );
}
