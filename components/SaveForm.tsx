"use client";

import { useState, useTransition } from "react";

// Formulário com retorno visível: mostra "Salvando...", confirma que salvou e
// avisa se deu erro. Sem isso a pessoa clica em salvar e não sabe se pegou.
export default function SaveForm({
  action,
  label,
  children,
  className = "card space-y-4",
}: {
  action: (formData: FormData) => Promise<any>;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok?: boolean; error?: string } | null>(null);

  return (
    <form
      action={(formData) => {
        setMsg(null);
        start(async () => {
          try {
            const res = await action(formData);
            if (res?.error) setMsg({ error: res.error });
            else setMsg({ ok: true });
          } catch (e: any) {
            setMsg({ error: e?.message || "Não consegui salvar." });
          }
        });
      }}
      className={className}
    >
      {children}

      <button disabled={pending} className="btn-primary w-full">
        {pending ? "Salvando..." : label}
      </button>

      {msg?.ok && (
        <p className="text-center text-sm font-semibold text-court-600">
          Salvo! ✓
        </p>
      )}
      {msg?.error && (
        <p className="text-center text-sm text-rose-500">{msg.error}</p>
      )}
    </form>
  );
}
