"use client";

import { useState, useTransition } from "react";
import { addMemberByEmail } from "@/app/actions/groups";

export default function AddMemberForm({ groupId }: { groupId: string }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<{ ok?: boolean; error?: string } | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(formData: FormData) {
    setMsg(null);
    start(async () => {
      const res = await addMemberByEmail(groupId, formData);
      setMsg(res);
      if (res?.ok) {
        (document.getElementById("add-email") as HTMLInputElement).value = "";
      }
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary w-full">
        ＋ Adicionar jogador
      </button>
    );
  }

  return (
    <div className="card space-y-3">
      <p className="text-sm font-semibold text-slate-700">
        Adicionar jogador por e-mail
      </p>
      <form action={onSubmit} className="flex gap-2">
        <input
          id="add-email"
          name="email"
          type="email"
          required
          placeholder="email@do.jogador"
          className="input flex-1"
        />
        <button disabled={pending} className="btn-primary !px-4">
          {pending ? "..." : "Add"}
        </button>
      </form>
      {msg?.error && <p className="text-sm text-rose-500">{msg.error}</p>}
      {msg?.ok && (
        <p className="text-sm text-court-600">Jogador adicionado! ✓</p>
      )}
      <button
        onClick={() => setOpen(false)}
        className="text-xs text-slate-400"
      >
        Fechar
      </button>
    </div>
  );
}
