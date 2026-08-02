"use client";

import { useState, useTransition } from "react";
import { addExternalMatch } from "@/app/actions/external";
import {
  PHASES,
  PHASE_LABEL,
  SET_LABELS,
  pairLabel,
  type ExternalPair,
  type Phase,
} from "@/lib/external";

const NEW_PAIR = "__nova__";

export default function ExternalMatchForm({
  tournamentId,
  defaultPhase,
  pairs,
}: {
  tournamentId: string;
  defaultPhase: Phase;
  pairs: ExternalPair[];
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok?: boolean; error?: string } | null>(null);
  const [pairId, setPairId] = useState(pairs.length ? pairs[0].id : NEW_PAIR);

  const selected = pairs.find((p) => p.id === pairId);
  const typing = !selected;

  function onSubmit(formData: FormData) {
    setMsg(null);
    start(async () => {
      const res = await addExternalMatch(tournamentId, formData);
      setMsg(res ?? null);
      if (res?.ok) {
        (document.getElementById("ext-match-form") as HTMLFormElement)?.reset();
        // Volta para a lista: a dupla recém-digitada já foi guardada.
        if (pairs.length) setPairId(pairs[0].id);
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

          {pairs.length > 0 && (
            <select
              value={pairId}
              onChange={(e) => setPairId(e.target.value)}
              className="input mb-2"
            >
              {pairs.map((p) => (
                <option key={p.id} value={p.id}>
                  {pairLabel(p)}
                </option>
              ))}
              <option value={NEW_PAIR}>➕ Outra dupla (digitar)</option>
            </select>
          )}

          {typing ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <input name="opponent1" placeholder="Jogadora 1" className="input" />
                <input name="opponent2" placeholder="Jogadora 2" className="input" />
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                A dupla fica salva automaticamente — no próximo jogo é só
                escolher na lista.
              </p>
            </>
          ) : (
            <>
              <input type="hidden" name="opponent1" value={selected.player1} />
              <input type="hidden" name="opponent2" value={selected.player2} />
            </>
          )}
        </div>

        <div>
          <label className="label">Placar por set</label>
          <div className="space-y-2">
            {SET_LABELS.map((label, idx) => {
              const i = idx + 1;
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-20 shrink-0 text-xs font-semibold leading-tight text-slate-500">
                    {label}
                  </span>
                  <input
                    name={`s${i}a`}
                    type="number"
                    min={0}
                    inputMode="numeric"
                    placeholder="Nós"
                    className="input text-center"
                  />
                  <span className="text-slate-400">×</span>
                  <input
                    name={`s${i}b`}
                    type="number"
                    min={0}
                    inputMode="numeric"
                    placeholder="Adversários"
                    className="input text-center"
                  />
                </div>
              );
            })}
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
