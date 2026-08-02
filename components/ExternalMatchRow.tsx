"use client";

import { useState, useTransition } from "react";
import {
  deleteExternalMatch,
  updateExternalMatch,
} from "@/app/actions/external";
import {
  PHASES,
  PHASE_LABEL,
  SET_LABELS,
  opponentLabel,
  type ExternalMatch,
  type Phase,
} from "@/lib/external";

export default function ExternalMatchRow({
  tournamentId,
  match,
  myPair,
}: {
  tournamentId: string;
  match: ExternalMatch;
  // "Henrique / Leandro" — eu e meu parceiro no torneio
  myPair: string;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const sets = match.set_scores;
  const them = opponentLabel(match);

  if (editing) {
    return (
      <form
        action={(formData) => {
          setError(null);
          start(async () => {
            const res = await updateExternalMatch(
              tournamentId,
              match.id,
              formData
            );
            if (res?.error) setError(res.error);
            else setEditing(false);
          });
        }}
        className="card space-y-3"
      >
        <p className="text-sm font-semibold text-slate-700">Editar jogo</p>

        <div>
          <label className="label">Fase</label>
          <select name="phase" defaultValue={match.phase} className="input">
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
            <input
              name="opponent1"
              defaultValue={match.opponent1 ?? ""}
              placeholder="Jogador 1"
              className="input"
            />
            <input
              name="opponent2"
              defaultValue={match.opponent2 ?? ""}
              placeholder="Jogador 2"
              className="input"
            />
          </div>
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
                    defaultValue={sets[idx]?.[0] ?? ""}
                    placeholder="Nós"
                    className="input text-center"
                  />
                  <span className="text-slate-400">×</span>
                  <input
                    name={`s${i}b`}
                    type="number"
                    min={0}
                    inputMode="numeric"
                    defaultValue={sets[idx]?.[1] ?? ""}
                    placeholder="Adversários"
                    className="input text-center"
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2">
          <button disabled={pending} className="btn-primary flex-1">
            {pending ? "Salvando..." : "Salvar"}
          </button>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setEditing(false);
            }}
            className="btn-ghost"
          >
            Cancelar
          </button>
        </div>
        {error && <p className="text-sm text-rose-500">{error}</p>}
      </form>
    );
  }

  return (
    <div className="card !p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="truncate text-xs font-semibold uppercase tracking-wide text-slate-400">
          {PHASE_LABEL[match.phase] ?? match.phase}
        </span>
        <span
          className={`chip shrink-0 ${
            match.won
              ? "bg-court-100 text-court-700"
              : "bg-rose-100 text-rose-600"
          }`}
        >
          {match.won ? "Vitória" : "Derrota"}
        </span>
      </div>

      <div className="mt-3 space-y-1.5">
        <ScoreLine name={myPair} games={sets.map((s) => s[0])} winner={match.won} />
        <ScoreLine name={them} games={sets.map((s) => s[1])} winner={!match.won} />
      </div>

      <div className="mt-3 flex justify-end gap-1 border-t border-slate-50 pt-2">
        <button
          onClick={() => setEditing(true)}
          className="rounded-lg px-3 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-700"
        >
          Editar
        </button>
        <button
          disabled={pending}
          onClick={() => {
            if (confirm("Excluir este jogo?"))
              start(async () => {
                await deleteExternalMatch(tournamentId, match.id);
              });
          }}
          className="rounded-lg px-3 py-1 text-xs font-semibold text-slate-400 hover:bg-rose-50 hover:text-rose-500"
        >
          Excluir
        </button>
      </div>
    </div>
  );
}

function ScoreLine({
  name,
  games,
  winner,
}: {
  name: string;
  games: number[];
  winner: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`min-w-0 flex-1 truncate text-sm ${
          winner ? "font-bold text-slate-900" : "text-slate-500"
        }`}
      >
        {name}
      </span>
      <span className="flex shrink-0 gap-2">
        {games.map((g, i) => (
          <span
            key={i}
            className={`w-6 text-center text-sm tabular-nums ${
              winner ? "font-black text-slate-900" : "text-slate-500"
            }`}
          >
            {g}
          </span>
        ))}
      </span>
    </div>
  );
}
