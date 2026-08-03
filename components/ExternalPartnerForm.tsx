"use client";

import { useState, useTransition } from "react";
import {
  createExternalPartner,
  deleteExternalPartner,
  updateExternalPartner,
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

export function ExternalPartnerRow({
  partner,
}: {
  partner: { id: string; name: string };
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
            const res = await updateExternalPartner(partner.id, formData);
            if (res?.error) setError(res.error);
            else setEditing(false);
          });
        }}
        className="card space-y-3"
      >
        <input
          name="name"
          defaultValue={partner.name}
          className="input"
          autoFocus
        />
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
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-court-50 text-sm">
        🤝
      </span>
      <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">
        {partner.name}
      </p>
      <button
        onClick={() => setEditing(true)}
        className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-700"
      >
        Editar
      </button>
      <button
        disabled={pending}
        onClick={() => {
          if (
            confirm(
              "Excluir este parceiro da lista? Os torneios já lançados com ele continuam intactos."
            )
          )
            start(async () => {
              await deleteExternalPartner(partner.id);
            });
        }}
        className="shrink-0 rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-rose-50 hover:text-rose-500"
      >
        Excluir
      </button>
    </div>
  );
}
