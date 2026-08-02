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
  canAdvance,
}: {
  tournamentId: string;
  canAdvance: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"botoes" | "perguntando" | "escrevendo">(
    "botoes"
  );
  const [notes, setNotes] = useState("");

  function finish(withNotes?: string) {
    setError(null);
    start(async () => {
      const res = await eliminateExternal(tournamentId, withNotes);
      if (res?.error) {
        setError(res.error);
        setStep("botoes");
      }
    });
  }

  if (step === "perguntando") {
    return (
      <div className="card space-y-3">
        <p className="text-sm font-semibold text-slate-700">
          Quer registrar alguma observação sobre a sua performance neste torneio?
        </p>
        <p className="text-xs text-slate-500">
          O que funcionou, o que faltou, como estava o vento. Com o tempo isso
          vira um diário do seu jogo.
        </p>
        <div className="grid gap-2">
          <button
            onClick={() => setStep("escrevendo")}
            className="btn-primary w-full"
          >
            Sim, quero escrever
          </button>
          <button
            disabled={pending}
            onClick={() => finish()}
            className="btn-ghost w-full"
          >
            {pending ? "Finalizando..." : "Não, pode finalizar"}
          </button>
        </div>
        {error && <p className="text-sm text-rose-500">{error}</p>}
      </div>
    );
  }

  if (step === "escrevendo") {
    return (
      <div className="card space-y-3">
        <p className="text-sm font-semibold text-slate-700">
          Como foi a sua performance?
        </p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          autoFocus
          placeholder="Ex: saque melhorou muito, mas errei muita devolução no vento contra."
          className="input"
        />
        <div className="flex gap-2">
          <button
            disabled={pending}
            onClick={() => finish(notes)}
            className="btn-primary flex-1"
          >
            {pending ? "Finalizando..." : "Finalizar torneio"}
          </button>
          <button
            type="button"
            onClick={() => setStep("perguntando")}
            className="btn-ghost"
          >
            Voltar
          </button>
        </div>
        {error && <p className="text-sm text-rose-500">{error}</p>}
      </div>
    );
  }

  return (
    <div className="card space-y-3">
      <p className="text-sm font-semibold text-slate-700">E aí, como terminou?</p>
      <div className="grid gap-2">
        {canAdvance && (
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
            ✅ Avançou de fase
          </button>
        )}
        <button
          disabled={pending}
          onClick={() => {
            setError(null);
            setStep("perguntando");
          }}
          className="btn-ghost w-full"
        >
          ❌ Foi eliminado (a) aqui
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
