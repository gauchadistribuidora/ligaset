"use client";

import { useState, useTransition } from "react";
import { addExternalMatch } from "@/app/actions/external";
import { PHASES, PHASE_LABEL, type Phase } from "@/lib/external";

export default function ExternalMatchForm({
  tournamentId,
  defaultPhase,
}: {
  tournamentId: string;
  defaultPhase: Phase;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok?: boolean; error?: string } | null>(null);

  function onSubmit(formData: FormData) {
    setMsg(null);
    start(async () => {
      const res = await addExternalMatch(tournamentId, formData);
      setMsg(res ?? null);
      if (res?.ok) {
        (document.getElementById("ext-match-form") as HTMLFormElement)?.reset();
      }
    });
  }

  return (
    <div className="card space-y-3">
      <p className="text-sm font-semibold text-slate-700">Lançar jogo</p>
      <form id="ext-match-form" action={onSubmit} className="space-y-3">
        <div>
          <label className="label">Fase</label>
          <select name="phase" defaultValue={defaultPhase} className="input">
            {PHASES.map((p) => (
              <option key={p} value={p}>
                {PHASE_LABEL[p]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Dupla adversária</label>
          <div className="grid grid-cols-2 gap-2">
            <input name="opponent1" placeholder="Jogadora 1" className="input" />
            <input name="opponent2" placeholder="Jogadora 2" className="input" />
          </div>
        </div>

        <div>
          <label className="label">Placar por set</label>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-12 shrink-0 text-xs font-semibold text-slate-500">
                  Set {i}
                </span>
                <input
                  name={`s${i}a`}
                  type="number"
                  min={0}
                  inputMode="numeric"
                  placeholder="nós"
                  className="input text-center"
                />
                <span className="text-slate-400">×</span>
                <input
                  name={`s${i}b`}
                  type="number"
                  min={0}
                  inputMode="numeric"
                  placeholder="elas"
                  className="input text-center"
                />
              </div>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-slate-400">
            Preencha só os sets que foram jogados. Quem venceu é calculado
            automaticamente.
          </p>
        </div>

        <button disabled={pending} className="btn-primary w-full">
          {pending ? "Salvando..." : "Salvar jogo"}
        </button>
      </form>

      {msg?.error && <p className="text-sm text-rose-500">{msg.error}</p>}
      {msg?.ok && <p className="text-sm text-court-600">Jogo lançado! ✓</p>}
    </div>
  );
}
