"use client";

import { useState, useTransition } from "react";
import {
  createExternalPair,
  deleteExternalPair,
} from "@/app/actions/external";

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
          <input name="player1" placeholder="Jogadora 1" className="input" />
          <input name="player2" placeholder="Jogadora 2" className="input" />
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

export function DeleteExternalPairButton({ pairId }: { pairId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => {
        if (confirm("Excluir esta dupla da sua lista?"))
          start(async () => {
            await deleteExternalPair(pairId);
          });
      }}
      className="shrink-0 rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-rose-50 hover:text-rose-500"
    >
      Excluir
    </button>
  );
}
