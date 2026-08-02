"use client";

import { useState, useTransition } from "react";
import {
  createExternalPartner,
  deleteExternalPartner,
} from "@/app/actions/external";

export default function ExternalPartnerForm() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok?: boolean; error?: string } | null>(null);

  function onSubmit(formData: FormData) {
    setMsg(null);
    start(async () => {
      const res = await createExternalPartner(formData);
      setMsg(res ?? null);
      if (res?.ok) {
        (document.getElementById("ext-partner-form") as HTMLFormElement)?.reset();
      }
    });
  }

  return (
    <div className="card space-y-3">
      <p className="text-sm font-semibold text-slate-700">Novo parceiro</p>
      <form id="ext-partner-form" action={onSubmit} className="space-y-3">
        <input
          name="name"
          placeholder="Nome de quem joga com você"
          className="input"
        />
        <button disabled={pending} className="btn-primary w-full">
          {pending ? "Salvando..." : "Cadastrar parceiro"}
        </button>
      </form>
      {msg?.error && <p className="text-sm text-rose-500">{msg.error}</p>}
      {msg?.ok && <p className="text-sm text-court-600">Parceiro cadastrado! ✓</p>}
    </div>
  );
}

export function DeleteExternalPartnerButton({
  partnerId,
}: {
  partnerId: string;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => {
        if (
          confirm(
            "Excluir este parceiro da lista? Os torneios já lançados com ele continuam intactos."
          )
        )
          start(async () => {
            await deleteExternalPartner(partnerId);
          });
      }}
      className="shrink-0 rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-rose-50 hover:text-rose-500"
    >
      Excluir
    </button>
  );
}
