"use client";

import { useState, useTransition } from "react";
import { addPlayer } from "@/app/actions/groups";

export default function AddMemberForm({ groupId }: { groupId: string }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<{ ok?: boolean; error?: string } | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(formData: FormData) {
    setMsg(null);
    start(async () => {
      const res = await addPlayer(groupId, formData);
      setMsg(res);
      if (res?.ok) {
        (document.getElementById("player-form") as HTMLFormElement)?.reset();
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
      <p className="text-sm font-semibold text-slate-700">Novo jogador</p>
      <form id="player-form" action={onSubmit} className="space-y-3">
        <div>
          <label className="label">Nome *</label>
          <input name="name" required placeholder="Ex: João Silva" className="input" />
        </div>
        <div>
          <label className="label">Telefone</label>
          <input name="phone" placeholder="(00) 00000-0000" className="input" />
        </div>
        <div>
          <label className="label">E-mail (opcional)</label>
          <input name="email" type="email" placeholder="para convidar depois" className="input" />
        </div>
        <div className="flex gap-2">
          <button disabled={pending} className="btn-primary flex-1">
            {pending ? "Salvando..." : "Adicionar"}
          </button>
          <button type="button" onClick={() => setOpen(false)} className="btn-ghost">
            Fechar
          </button>
        </div>
      </form>
      {msg?.error && <p className="text-sm text-rose-500">{msg.error}</p>}
      {msg?.ok && <p className="text-sm text-court-600">Jogador adicionado! ✓</p>}
      <p className="text-xs text-slate-400">
        O nome já basta. O e-mail é opcional e serve para convidar o jogador a
        acessar o app depois.
      </p>
    </div>
  );
}
