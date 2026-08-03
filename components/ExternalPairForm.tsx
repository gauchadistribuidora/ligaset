"use client";

import { useState, useTransition } from "react";
import {
  createExternalPair,
  deleteExternalPair,
  updateExternalPair,
} from "@/app/actions/external";
import { pairLabel } from "@/lib/external";

export default function ExternalPairForm() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok?: boolean; error?: string } | null>(null);

  function onSubmit(formData: FormData) {
    setMsg(null);
    start(async () => {
      const res = await createExternalPair(formData);
      setMsg(res ?? null);
      if (res?.ok) {
        (document.getElementById("ext-pair-form") as HTMLFormElement)?.reset();
      }
    });
  }

  return (
    <div className="card space-y-3">
      <p className="text-sm font-semibold text-slate-700">Nova dupla</p>
      <form id="ext-pair-form" action={onSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <input name="player1" placeholder="Jogador 1" className="input" />
          <input name="player2" placeholder="Jogador 2" className="input" />
        </div>
        <button disabled={pending} className="btn-primary w-full">
          {pending ? "Salvando..." : "Cadastrar dupla"}
        </button>
      </form>
      {msg?.error && <p className="text-sm text-rose-500">{msg.error}</p>}
      {msg?.ok && <p className="text-sm text-court-600">Dupla cadastrada! ✓</p>}
    </div>
  );
}

export function ExternalPairRow({
  pair,
  matches,
}: {
  pair: { id: string; player1: string; player2: string };
  // Quantos jogos já foram disputados contra esta dupla.
  matches: number;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (editing) {
    return (
      <form
        action={(formData) => {
          setError(null);
          start(async () => {
            const res = await updateExternalPair(pair.id, formData);
            if (res?.error) setError(res.error);
            else setEditing(false);
          });
        }}
        className="card space-y-3"
      >
        <div className="grid grid-cols-2 gap-2">
          <input
            name="player1"
            defaultValue={pair.player1}
            className="input"
            autoFocus
          />
          <input name="player2" defaultValue={pair.player2} className="input" />
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
    <div className="card flex items-center gap-3 !p-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ocean-900/5 text-sm">
        🎾
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800">
          {pairLabel(pair)}
        </p>
        <p className="text-xs text-slate-400">
          {matches ? `${matches} jogo(s) disputado(s)` : "Ainda não enfrentada"}
        </p>
      </div>
      <button
        onClick={() => setEditing(true)}
        className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-700"
      >
        Editar
      </button>
      <button
        disabled={pending}
        onClick={() => {
          if (confirm("Excluir esta dupla da sua lista?"))
            start(async () => {
              await deleteExternalPair(pair.id);
            });
        }}
        className="shrink-0 rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-rose-50 hover:text-rose-500"
      >
        Excluir
      </button>
    </div>
  );
}
