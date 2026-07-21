"use client";

import { useState, useTransition } from "react";
import { inviteEmails } from "@/app/actions/groups";

type Res = { ok?: boolean; error?: string; sent?: number; failed?: string[] };

export default function InviteBox({ groupId }: { groupId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<Res | null>(null);

  function onSubmit(formData: FormData) {
    setMsg(null);
    start(async () => {
      const res = (await inviteEmails(
        groupId,
        window.location.origin,
        formData
      )) as Res;
      setMsg(res);
      if (res?.ok)
        (document.getElementById("invite-form") as HTMLFormElement)?.reset();
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-ghost w-full">
        ✉️ Convidar por e-mail
      </button>
    );
  }

  return (
    <div className="card space-y-3">
      <p className="text-sm font-semibold text-slate-700">Convidar por e-mail</p>
      <form id="invite-form" action={onSubmit} className="space-y-3">
        <textarea
          name="emails"
          rows={3}
          placeholder="Cole um ou vários e-mails (separados por vírgula, espaço ou quebra de linha)"
          className="input resize-none"
        />
        <div className="flex gap-2">
          <button disabled={pending} className="btn-primary flex-1">
            {pending ? "Enviando..." : "Enviar convites"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="btn-ghost"
          >
            Fechar
          </button>
        </div>
      </form>
      {msg?.error && <p className="text-sm text-rose-500">{msg.error}</p>}
      {msg?.ok && (
        <p className="text-sm text-court-600">
          {msg.sent} convite(s) enviado(s)! ✓
          {msg.failed && msg.failed.length > 0
            ? ` Não enviados: ${msg.failed.join(", ")}.`
            : ""}
        </p>
      )}
      <p className="text-xs text-slate-400">
        Cada pessoa recebe um link para entrar e definir a senha. Quem ainda não
        está no grupo é adicionado como jogador automaticamente.
      </p>
    </div>
  );
}
