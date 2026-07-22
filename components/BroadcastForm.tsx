"use client";

import { useState, useTransition } from "react";
import { sendBroadcast } from "@/app/actions/admin";

export default function BroadcastForm() {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok?: boolean; error?: string; count?: number } | null>(null);

  function onSubmit(formData: FormData) {
    setMsg(null);
    start(async () => {
      const res = await sendBroadcast(formData);
      setMsg(res as any);
      if ((res as any)?.ok)
        (document.getElementById("broadcast-form") as HTMLFormElement)?.reset();
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary w-full">
        📣 Enviar informativo por e-mail
      </button>
    );
  }

  return (
    <div className="card space-y-3">
      <p className="text-sm font-semibold text-slate-700">
        Informativo para todos os usuários
      </p>
      <form id="broadcast-form" action={onSubmit} className="space-y-3">
        <div>
          <label className="label">Assunto</label>
          <input name="subject" required placeholder="Ex: Novidades do LigaSet" className="input" />
        </div>
        <div>
          <label className="label">Mensagem</label>
          <textarea
            name="message"
            required
            rows={5}
            placeholder="Escreva o informativo..."
            className="input resize-none"
          />
        </div>
        <div className="flex gap-2">
          <button disabled={pending} className="btn-primary flex-1">
            {pending ? "Enviando..." : "Enviar para todos"}
          </button>
          <button type="button" onClick={() => setOpen(false)} className="btn-ghost">
            Fechar
          </button>
        </div>
      </form>
      {msg?.error && <p className="text-sm text-rose-500">{msg.error}</p>}
      {msg?.ok && (
        <p className="text-sm text-court-600">
          Informativo enviado para {msg.count} e-mail(s)! ✓
        </p>
      )}
      <p className="text-xs text-slate-400">
        Enviado com cópia oculta (os destinatários não veem os e-mails uns dos outros).
      </p>
    </div>
  );
}
